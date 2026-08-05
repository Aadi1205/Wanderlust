const crypto = require("crypto");
const mongoose = require("mongoose");
const { razorpay } = require("../razorpayConfig.js");
const Booking = require("../models/booking.js");
const Payment = require("../models/payment.js");

//hex-encoded HMAC digests are fixed-length for a given algorithm, but a
//tampered/garbage signature from the client can be any length - guard the
//length before timingSafeEqual, which throws (not returns false) on mismatch
function safeEqualHex(a, b) {
  const bufA = Buffer.from(a || "", "hex");
  const bufB = Buffer.from(b || "", "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

//render the pay page for a pending booking
module.exports.renderPayPage = async (req, res) => {
  const { bookingId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    req.flash("error", "Cannot find that booking");
    return res.redirect("/trips");
  }

  const booking = await Booking.findById(bookingId).populate("listing");
  if (!booking || !booking.guest.equals(req.user._id)) {
    req.flash("error", "Cannot find that booking");
    return res.redirect("/trips");
  }

  if (booking.status !== "pending") {
    req.flash("error", "This booking is not awaiting payment");
    return res.redirect("/trips");
  }

  return res.render("bookings/pay.ejs", { booking });
};

//create a Razorpay order for a pending booking - amount comes from the
//booking's own server-computed totalPrice snapshot, never from the client
module.exports.createOrder = async (req, res) => {
  const { bookingId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  const booking = await Booking.findById(bookingId);
  if (!booking || !booking.guest.equals(req.user._id)) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  if (booking.status !== "pending") {
    return res
      .status(400)
      .json({ success: false, message: "This booking is not awaiting payment" });
  }

  const amountInPaise = Math.round(booking.totalPrice * 100);

  try {
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: booking._id.toString(),
    });

    await Payment.create({
      booking: booking._id,
      razorpay_order_id: order.id,
      amount: amountInPaise,
      currency: "INR",
      status: "created",
    });

    return res.json({
      success: true,
      order_id: order.id,
      amount: amountInPaise,
      currency: "INR",
      key_id: process.env.RAZORPAY_KEY_ID,
      prefill: {
        name: req.user.fullName || req.user.username,
        email: req.user.email,
      },
    });
  } catch (err) {
    console.error("RAZORPAY CREATE ORDER ERROR:", err);
    return res
      .status(502)
      .json({ success: false, message: "Could not start payment. Please try again." });
  }
};

//verify the signature the client got back from Razorpay checkout. This is a
//fast client-side confirmation gate only - the webhook remains the source of
//truth for actually marking a booking confirmed.
module.exports.verifyPayment = async (req, res) => {
  const { bookingId } = req.params;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: "Missing payment details" });
  }

  const payment = await Payment.findOne({
    booking: bookingId,
    razorpay_order_id,
  });
  if (!payment) {
    return res.status(404).json({ success: false, message: "Payment record not found" });
  }

  //webhook may have already landed - nothing left for this endpoint to do
  if (payment.status === "paid") {
    return res.json({ success: true });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!safeEqualHex(expectedSignature, razorpay_signature)) {
    return res.status(400).json({ success: false, message: "Payment verification failed" });
  }

  payment.razorpay_payment_id = razorpay_payment_id;
  payment.razorpay_signature = razorpay_signature;
  await payment.save();

  return res.json({ success: true });
};

//Razorpay webhook - source of truth for marking a booking paid/failed.
//req.body is the raw request Buffer (see app.js), not parsed JSON, because
//the signature is computed over the exact bytes Razorpay sent.
module.exports.handleWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  if (!signature) {
    return res.status(400).send("Missing signature");
  }

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error("RAZORPAY WEBHOOK ERROR: RAZORPAY_WEBHOOK_SECRET is not configured");
    return res.status(500).send("Webhook not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(req.body)
    .digest("hex");

  if (!safeEqualHex(expectedSignature, signature)) {
    return res.status(400).send("Invalid signature");
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch (err) {
    return res.status(400).send("Invalid payload");
  }

  try {
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    if (!paymentEntity) {
      return res.status(200).send("Ignored");
    }

    const payment = await Payment.findOne({
      razorpay_order_id: paymentEntity.order_id,
    });
    if (!payment) {
      console.error("RAZORPAY WEBHOOK: no Payment for order", paymentEntity.order_id);
      return res.status(200).send("Ignored");
    }

    // idempotency: only ever transition out of "created" once
    if (payment.status !== "created") {
      return res.status(200).send("Already processed");
    }

    if (event === "payment.captured") {
      payment.status = "paid";
      payment.razorpay_payment_id = paymentEntity.id;
      await payment.save();
      await Booking.findByIdAndUpdate(payment.booking, { status: "confirmed" });
    } else if (event === "payment.failed") {
      payment.status = "failed";
      payment.razorpay_payment_id = paymentEntity.id;
      await payment.save();
      //free the dates - not cancelled by guest or host, so cancelledBy stays unset
      await Booking.findByIdAndUpdate(payment.booking, { status: "cancelled" });
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("RAZORPAY WEBHOOK ERROR:", err);
    return res.status(500).send("Webhook processing error");
  }
};

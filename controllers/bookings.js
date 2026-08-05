const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const Booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const Payment = require("../models/payment.js");
const { razorpay } = require("../razorpayConfig.js");
const toUTCMidnight = require("../utils/normalizeDate.js");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

async function findConflicts(listingId, checkIn, checkOut) {
  return Booking.find({
    listing: listingId,
    status: { $in: ["pending", "confirmed"] },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  });
}

//lazily flip confirmed bookings past their checkout date to "completed"
async function flipCompletedBookings(bookings) {
  const today = toUTCMidnight(new Date());
  const toFlip = bookings.filter(
    (b) => b.status === "confirmed" && b.checkOut < today
  );
  if (toFlip.length === 0) return;

  const ids = toFlip.map((b) => b._id);
  await Booking.updateMany(
    { _id: { $in: ids } },
    { $set: { status: "completed" } }
  );
  toFlip.forEach((b) => (b.status = "completed"));
}

//reserve form Route
module.exports.renderReserveForm = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Cannot find that listing");
    return res.redirect("/listings");
  }

  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Cannot find that listing");
    return res.redirect("/listings");
  }

  if (listing.owner.equals(req.user._id)) {
    req.flash("error", "You cannot book your own listing");
    return res.redirect(`/listings/${id}`);
  }

  return res.render("bookings/reserve.ejs", { listing });
};

//create booking Route
module.exports.createBooking = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Cannot find that listing");
    return res.redirect("/listings");
  }

  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Cannot find that listing");
    return res.redirect("/listings");
  }

  if (listing.owner.equals(req.user._id)) {
    req.flash("error", "You cannot book your own listing");
    return res.redirect(`/listings/${id}`);
  }

  const checkIn = toUTCMidnight(req.body.booking.checkIn);
  const checkOut = toUTCMidnight(req.body.booking.checkOut);
  const guests = Number(req.body.booking.guests);
  const today = toUTCMidnight(new Date());

  if (checkIn < today) {
    req.flash("error", "Check-in date cannot be in the past");
    return res.redirect(`/listings/${id}`);
  }

  if (checkOut <= checkIn) {
    req.flash("error", "Check-out must be after check-in");
    return res.redirect(`/listings/${id}`);
  }

  const nights = Math.round((checkOut - checkIn) / MS_PER_DAY);
  if (nights < 1 || nights > 30) {
    req.flash("error", "Stays must be between 1 and 30 nights");
    return res.redirect(`/listings/${id}`);
  }

  // NOTE: theoretical race condition - two concurrent requests could both
  // pass this conflict check before either has saved, double-booking the
  // same dates. Accepting that risk for now (no atomic hold/payment step).
  const conflicts = await findConflicts(id, checkIn, checkOut);
  if (conflicts.length > 0) {
    req.flash("error", "Those dates are no longer available");
    return res.redirect(`/listings/${id}`);
  }

  const pricePerNight = listing.price;
  const subtotal = nights * pricePerNight;
  const taxes = Math.round(subtotal * 0.18);
  const totalPrice = subtotal + taxes;

  const booking = new Booking({
    listing: listing._id,
    guest: req.user._id,
    host: listing.owner,
    checkIn,
    checkOut,
    guests,
    nights,
    pricePerNight,
    subtotal,
    taxes,
    totalPrice,
    listingSnapshot: {
      title: listing.title,
      imageUrl: listing.image.url,
      location: listing.location,
    },
  });
  //receipt number needs the _id, which only exists once the doc is constructed
  booking.receiptNumber = `WL-${booking._id.toString().slice(-8).toUpperCase()}`;

  await booking.save();

  req.flash("success", "Almost there - complete payment to confirm your booking.");
  return res.redirect(`/bookings/${booking._id}/pay`);
};

//availability Route (public JSON of booked date ranges)
module.exports.availability = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.json({ booked: [] });
  }

  const bookings = await Booking.find({
    listing: id,
    status: { $in: ["pending", "confirmed"] },
  }).select("checkIn checkOut");

  const booked = bookings.map((b) => ({
    checkIn: b.checkIn,
    checkOut: b.checkOut,
  }));

  return res.json({ booked });
};

//guest's trips Route
module.exports.trips = async (req, res) => {
  const bookings = await Booking.find({ guest: req.user._id })
    .populate("listing")
    .sort({ checkIn: -1 });

  await flipCompletedBookings(bookings);

  const today = toUTCMidnight(new Date());
  const upcoming = bookings.filter(
    (b) => b.status !== "cancelled" && b.checkOut >= today
  );
  const past = bookings.filter(
    (b) => b.status !== "cancelled" && b.checkOut < today
  );
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  const counts = {
    upcoming: upcoming.length,
    past: past.length,
    cancelled: cancelled.length,
  };

  const tab = ["upcoming", "past", "cancelled"].includes(req.query.tab)
    ? req.query.tab
    : "upcoming";
  const tabBookings = { upcoming, past, cancelled }[tab];

  return res.render("bookings/trips.ejs", { tab, counts, bookings: tabBookings });
};

//host's reservations Route
module.exports.dashboardBookings = async (req, res) => {
  const bookings = await Booking.find({ host: req.user._id })
    .populate("listing")
    .populate("guest")
    .sort({ checkIn: -1 });

  await flipCompletedBookings(bookings);

  const today = toUTCMidnight(new Date());
  const upcomingCount = bookings.filter(
    (b) =>
      (b.status === "confirmed" || b.status === "pending") &&
      b.checkOut >= today
  ).length;

  const totalNights = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + b.nights, 0);

  const grossEarnings = bookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + b.totalPrice, 0);

  return res.render("bookings/dashboard.ejs", {
    bookings,
    summary: { upcomingCount, totalNights, grossEarnings },
  });
};

//cancel booking Route
module.exports.cancelBooking = async (req, res) => {
  const { bookingId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    req.flash("error", "Cannot find that booking");
    return res.redirect("/trips");
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    req.flash("error", "Cannot find that booking");
    return res.redirect("/trips");
  }

  const isGuest = booking.guest.equals(req.user._id);
  const redirectTo = isGuest ? "/trips" : "/dashboard/bookings";

  if (booking.status === "cancelled") {
    req.flash("error", "This booking is already cancelled");
    return res.redirect(redirectTo);
  }

  const today = toUTCMidnight(new Date());
  if (booking.checkIn <= today) {
    req.flash("error", "This stay has already started and can't be cancelled");
    return res.redirect(redirectTo);
  }

  const payment = await Payment.findOne({ booking: booking._id, status: "paid" });

  if (payment) {
    const hoursUntilCheckIn = (booking.checkIn - Date.now()) / MS_PER_HOUR;
    const refundFraction = hoursUntilCheckIn >= 48 ? 1 : 0.5;
    const refundAmount = Math.round(payment.amount * refundFraction);

    try {
      const refund = await razorpay.payments.refund(payment.razorpay_payment_id, {
        amount: refundAmount,
      });
      booking.refund = {
        amount: refundAmount,
        status: refundFraction === 1 ? "full" : "partial",
        razorpayRefundId: refund.id,
        refundedAt: new Date(),
      };
    } catch (err) {
      console.error("RAZORPAY REFUND ERROR:", err);
      req.flash("error", "Could not process the refund. Please try again or contact support.");
      return res.redirect(redirectTo);
    }
  }

  booking.status = "cancelled";
  booking.cancelledBy = isGuest ? "guest" : "host";
  await booking.save();

  req.flash(
    "success",
    payment
      ? `Booking cancelled. ${booking.refund.status === "full" ? "Full" : "50%"} refund initiated.`
      : "Booking cancelled"
  );
  return res.redirect(redirectTo);
};

//stream a PDF receipt for a booking
module.exports.downloadInvoice = async (req, res) => {
  const { bookingId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    req.flash("error", "Cannot find that booking");
    return res.redirect("/trips");
  }

  //isBookingParty already confirmed req.user is the guest or host
  const booking = await Booking.findById(bookingId).populate("guest");
  if (!booking) {
    req.flash("error", "Cannot find that booking");
    return res.redirect("/trips");
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${booking.receiptNumber || booking._id}.pdf"`
  );

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text("WanderLust", { align: "left" });
  doc.fontSize(10).fillColor("#6b7280").text("Booking receipt").moveDown(1.5);
  doc.fillColor("#000");

  doc.fontSize(12).text(`Receipt #: ${booking.receiptNumber || booking._id}`);
  doc.text(`Booked by: ${booking.guest.fullName || booking.guest.username}`);
  doc.text(`Status: ${booking.status}`);
  doc.moveDown();

  doc.fontSize(14).text(booking.listingSnapshot.title || "Listing");
  doc.fontSize(11).text(booking.listingSnapshot.location || "");
  doc.moveDown();

  doc.text(
    `Check-in: ${booking.checkIn.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  );
  doc.text(
    `Check-out: ${booking.checkOut.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  );
  doc.text(`Nights: ${booking.nights}`);
  doc.text(`Guests: ${booking.guests}`);
  doc.moveDown();

  doc.text(`Price per night: Rs. ${booking.pricePerNight.toLocaleString("en-IN")}`);
  doc.text(`Subtotal: Rs. ${booking.subtotal.toLocaleString("en-IN")}`);
  doc.text(`Taxes (18%): Rs. ${booking.taxes.toLocaleString("en-IN")}`);
  doc.fontSize(13).text(`Total paid: Rs. ${booking.totalPrice.toLocaleString("en-IN")}`);

  if (booking.refund && booking.refund.status !== "none") {
    doc.moveDown();
    doc
      .fontSize(11)
      .fillColor("#b91c1c")
      .text(
        `Refunded (${booking.refund.status}): Rs. ${(booking.refund.amount / 100).toLocaleString("en-IN")}`
      );
  }

  doc.end();
};

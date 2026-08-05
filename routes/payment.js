const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isBookingGuest } = require("../middleware.js");
const paymentsController = require("../controllers/payments.js");

//pay page Route
router.get(
  "/bookings/:bookingId/pay",
  isLoggedIn,
  isBookingGuest,
  wrapAsync(paymentsController.renderPayPage)
);

//create Razorpay order Route
router.post(
  "/bookings/:bookingId/pay/order",
  isLoggedIn,
  isBookingGuest,
  wrapAsync(paymentsController.createOrder)
);

//verify payment Route
router.post(
  "/bookings/:bookingId/pay/verify",
  isLoggedIn,
  isBookingGuest,
  wrapAsync(paymentsController.verifyPayment)
);

module.exports = router;

const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const {
  isLoggedIn,
  isOwnerRole,
  isBookingParty,
  validateBooking,
} = require("../middleware.js");
const bookingsController = require("../controllers/bookings.js");

//reserve form Route
router.get(
  "/listings/:id/reserve",
  isLoggedIn,
  wrapAsync(bookingsController.renderReserveForm)
);

//create booking Route
router.post(
  "/listings/:id/book",
  isLoggedIn,
  validateBooking,
  wrapAsync(bookingsController.createBooking)
);

//availability Route (public)
router.get(
  "/listings/:id/availability",
  wrapAsync(bookingsController.availability)
);

//guest's trips Route
router.get("/trips", isLoggedIn, wrapAsync(bookingsController.trips));

//host's reservations Route
router.get(
  "/dashboard/bookings",
  isLoggedIn,
  isOwnerRole,
  wrapAsync(bookingsController.dashboardBookings)
);

//cancel booking Route
router.post(
  "/bookings/:bookingId/cancel",
  isLoggedIn,
  isBookingParty,
  wrapAsync(bookingsController.cancelBooking)
);

//invoice/receipt PDF Route
router.get(
  "/bookings/:bookingId/invoice",
  isLoggedIn,
  isBookingParty,
  wrapAsync(bookingsController.downloadInvoice)
);

module.exports = router;

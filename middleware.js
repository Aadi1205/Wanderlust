const Listing = require("./models/listing.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema } = require("./schema.js");
const { reviewSchema } = require("./schema.js");
const { profileSchema } = require("./schema.js");
const { bookingSchema } = require("./schema.js");
const Review = require("./models/review.js");
const Booking = require("./models/booking.js");

module.exports.isLoggedIn = (req, res, next) => {
  //console.log(req.user); //we can check: user is login or not
  if (!req.isAuthenticated()) {
    //redirect URL save
    req.session.redirectUrl = req.originalUrl; //a new property (key) adding inside the session
    req.flash("error", "You must be logged in to create listing!");
    return res.redirect("/login");
  }
  next();
};
// After login, Passport clears temporary session data,
module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

module.exports.isOwner = async (req, res, next) => {
  let { id } = req.params;
  let listing = await Listing.findById(id);
  if (!listing.owner._id.equals(res.locals.currUser._id)) {
    req.flash("error", "You do not have permission to do this!");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

//can this user host at all (different from isOwner, which checks THIS listing)
module.exports.isOwnerRole = (req, res, next) => {
  if (res.locals.currUser.role !== "owner") {
    req.flash("error", "You need to become a host to do that!");
    return res.redirect("/become-a-host");
  }
  next();
};
//for joi validation
module.exports.validateListing = (req, res, next) => {
  //let {error} = listingSchema.validate(req.body);
  const result = listingSchema.validate(req.body);
  let error = result.error;

  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

//for joi review
module.exports.validateReview = (req, res, next) => {
  //let {error} = listingSchema.validate(req.body);
  const result = reviewSchema.validate(req.body);
  let error = result.error;

  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

module.exports.isReviewAuthor = async (req, res, next) => {
  let { id, reviewId } = req.params;
  let review = await Review.findById(reviewId);
  if (!review.author._id.equals(res.locals.currUser._id)) {
    req.flash("error", "You are not the author of this review!");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

module.exports.isProfileOwner = (req, res, next) => {
  let { id } = req.params;
  if (!res.locals.currUser._id.equals(id)) {
    req.flash("error", "You do not have permission to do this!");
    return res.redirect(`/users/${id}`);
  }
  next();
};

//for joi profile validation
module.exports.validateProfile = (req, res, next) => {
  const result = profileSchema.validate(req.body);
  let error = result.error;

  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

//for joi booking validation
module.exports.validateBooking = (req, res, next) => {
  const result = bookingSchema.validate(req.body);
  let error = result.error;

  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

//allow through if the user is EITHER the guest or the host on this booking
module.exports.isBookingParty = async (req, res, next) => {
  let { bookingId } = req.params;
  let booking = await Booking.findById(bookingId);
  const isGuest = booking.guest.equals(res.locals.currUser._id);
  const isHost = booking.host.equals(res.locals.currUser._id);
  if (!isGuest && !isHost) {
    req.flash("error", "You do not have permission to do this!");
    return res.redirect("/trips");
  }
  next();
};

//only the guest may pay for/verify a booking - the host has no reason to
module.exports.isBookingGuest = async (req, res, next) => {
  let { bookingId } = req.params;
  let booking = await Booking.findById(bookingId);
  if (!booking || !booking.guest.equals(res.locals.currUser._id)) {
    req.flash("error", "You do not have permission to do this!");
    return res.redirect("/trips");
  }
  next();
};

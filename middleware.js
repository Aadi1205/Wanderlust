const Listing = require("./models/listing.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema } = require("./schema.js");
const { reviewSchema } = require("./schema.js");
const Review = require("./models/review.js");

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

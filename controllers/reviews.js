const Listing = require("../models/listing");
const Review = require("../models/review");

//post review controller
module.exports.createReview = async (req, res) => {
  let listing = await Listing.findById(req.params.id);
  let newReview = new Review(req.body.review);
  newReview.author = req.user._id;
  console.log(newReview);

  listing.reviews.push(newReview);
  await newReview.save();
  await listing.save();
  console.log("New review saved");
  req.flash("success", "Successfully created a new review");
  return res.redirect(`/listings/${req.params.id}`);
};

//delete review controller
module.exports.deleteReview = async (req, res) => {
  let { id, reviewId } = req.params;
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);
  req.flash("success", "Successfully deleted a review");
  return res.redirect(`/listings/${id}`);
};

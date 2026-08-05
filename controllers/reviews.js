const Listing = require("../models/listing");
const Review = require("../models/review");

//recompute and cache a listing's average rating + review count
async function recomputeListingRating(listingId) {
  const listing = await Listing.findById(listingId);
  const reviews = await Review.find({ _id: { $in: listing.reviews } });

  const reviewCount = reviews.length;
  const avgRating = reviewCount
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;

  listing.avgRating = avgRating;
  listing.reviewCount = reviewCount;
  await listing.save();
}

//post review controller
module.exports.createReview = async (req, res) => {
  let listing = await Listing.findById(req.params.id);
  let newReview = new Review(req.body.review);
  newReview.author = req.user._id;
  console.log(newReview);

  listing.reviews.push(newReview);
  await newReview.save();
  await listing.save();
  await recomputeListingRating(req.params.id);
  console.log("New review saved");
  req.flash("success", "Successfully created a new review");
  req.session.save(() => {
    res.redirect(`/listings/${req.params.id}`);
  });
};

//delete review controller
module.exports.deleteReview = async (req, res) => {
  let { id, reviewId } = req.params;
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);
  await recomputeListingRating(id);
  req.flash("success", "Successfully deleted a review");
  req.session.save(() => {
    res.redirect(`/listings/${id}`);
  });
};

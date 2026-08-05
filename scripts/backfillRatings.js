// One-off script: run with `node scripts/backfillRatings.js`
// Computes avgRating/reviewCount for listings that predate those cached fields.
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");

async function main() {
  await mongoose.connect(process.env.ATLAS_DB_URL);

  const listings = await Listing.find({});
  let updated = 0;

  for (const listing of listings) {
    const reviews = await Review.find({ _id: { $in: listing.reviews } });
    const reviewCount = reviews.length;
    const avgRating = reviewCount
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

    listing.avgRating = avgRating;
    listing.reviewCount = reviewCount;
    await listing.save();
    updated++;
  }

  console.log(`Backfilled avgRating/reviewCount for ${updated} listing(s)`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");
const Booking = require("./booking.js");
const toUTCMidnight = require("../utils/normalizeDate.js");

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  //setting default img
  // image: {
  //   filename: {
  //     type: String,
  //     default: "listingimage",
  //   },
  //   url: {
  //     type: String,
  //     default:
  //       "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1073&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  //     set: (v) =>
  //       v === ""
  //         ? "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1073&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  //         : v,
  //   },
  // },
  image: {
    url: String,
    filename: String,
  },
  price: Number,
  location: String,
  country: String,

  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },],

  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  geometry: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    }
  },
  category: {
  type: String,
  enum: [
    "Trending",
    "Room",
    "Iconic",
    "Mountain",
    "Castles",
    "Pools",
    "Camping",
    "Farms",
    "Arctic",
    "Domes",
    "Boat"
  ],
  required: true
},
  //cached from Review docs so the index/show pages don't need to populate
  //every listing's reviews just to show a number - kept in sync in
  //controllers/reviews.js whenever a review is created/deleted
  avgRating: {
    type: Number,
    default: 0,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
});

//handling: Delete listing: Post middleware
listingSchema.post("findOneAndDelete", async(listing) => {
  if(listing) {
    await Review.deleteMany({_id: {$in: listing.reviews}});

    //cancel (never delete) this listing's future bookings; attributed to the
    //host since deleting the listing is the host's action
    await Booking.updateMany(
      {
        listing: listing._id,
        status: { $in: ["pending", "confirmed"] },
        checkOut: { $gt: toUTCMidnight(new Date()) },
      },
      { $set: { status: "cancelled", cancelledBy: "host" } }
    );
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;


















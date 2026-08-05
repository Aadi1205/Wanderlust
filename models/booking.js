const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
  listing: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
  },
  guest: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  host: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  checkIn: {
    type: Date,
    required: true,
  },
  checkOut: {
    type: Date,
    required: true,
  },
  guests: {
    type: Number,
    required: true,
    min: 1,
  },
  nights: {
    type: Number,
    required: true,
  },
  //snapshots taken at booking time - never recompute from listing.price,
  //a host raising their rate must not change existing bookings
  pricePerNight: {
    type: Number,
    required: true,
  },
  subtotal: {
    type: Number,
    required: true,
  },
  taxes: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending",
  },
  cancelledBy: {
    type: String,
    enum: ["guest", "host"],
  },
  //captured at booking time so a receipt/trip card still reads correctly
  //even if the listing is later edited or deleted
  listingSnapshot: {
    title: String,
    imageUrl: String,
    location: String,
  },
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  refund: {
    amount: Number, //paise
    status: {
      type: String,
      enum: ["none", "full", "partial"],
      default: "none",
    },
    razorpayRefundId: String,
    refundedAt: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

bookingSchema.index({ listing: 1, checkIn: 1, checkOut: 1 });

module.exports = mongoose.model("Booking", bookingSchema);

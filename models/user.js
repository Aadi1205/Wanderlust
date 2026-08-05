const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const passportLocalMongoose =
  require("passport-local-mongoose").default || 
  require("passport-local-mongoose");

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  fullName: {
    type: String,
    maxlength: 60,
  },
  bio: {
    type: String,
    maxlength: 500,
  },
  location: {
    type: String,
    maxlength: 100,
  },
  avatar: {
    url: String,
    filename: String,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    enum: ["customer", "owner"],
    default: "customer",
  },
  hostSince: {
    type: Date,
  },
  wishlist: [
    {
      type: Schema.Types.ObjectId,
      ref: "Listing",
    },
  ],
});

//fallback avatar: up to 2 uppercase letters from fullName, else username
userSchema.virtual("initials").get(function () {
  const source = (this.fullName && this.fullName.trim()) || this.username || "";
  if (!source) return "";
  const parts = source.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);

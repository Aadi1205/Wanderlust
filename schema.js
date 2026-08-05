//for server-side validation
const Joi = require("joi");

module.exports.listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    price: Joi.number().required().min(1),
    location: Joi.string().required(),
    country: Joi.string().required(),
    category: Joi.string()
      .valid(
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
      )
      .required(),
    image: Joi.object({
      url: Joi.string().allow("", null),
    }).optional(),
  }).required(),
});

module.exports.reviewSchema = Joi.object({
  review: Joi.object({
    comment: Joi.string().required(),
    rating: Joi.number().required().min(1).max(5),
  }).required(),
});

module.exports.bookingSchema = Joi.object({
  booking: Joi.object({
    checkIn: Joi.date().required(),
    checkOut: Joi.date().required().greater(Joi.ref("checkIn")),
    guests: Joi.number().integer().min(1).max(16).required(),
  }).required(),
});

module.exports.profileSchema = Joi.object({
  user: Joi.object({
    fullName: Joi.string().max(60).allow("").optional(),
    bio: Joi.string().max(500).allow("").optional(),
    location: Joi.string().max(100).allow("").optional(),
    email: Joi.string().email({ tlds: false }).required(),
  }).required(),
});

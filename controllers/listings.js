const Listing = require("../models/listing");
const { cloudinary } = require("../cloudConfig");

async function geocodeLocation(location) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        location
      )}`,
      {
        headers: {
          "User-Agent": "wanderlust-app",
        },
        timeout: 5000,
      }
    );

    if (!res.ok) throw new Error("Geocoding failed");

    const data = await res.json();

    return data[0]
      ? [parseFloat(data[0].lon), parseFloat(data[0].lat)]
      : [77.209, 28.6139];
  } catch (err) {
    console.error("Geocoding error:", err.message);
    return [77.209, 28.6139]; // fallback Delhi
  }
}

//creatgin
module.exports.renderSignupForm = (req, res) => {
  return res.render("users/signup.ejs");
};

//creating a controller for listings (functions to be used in routes)
// module.exports.index = async (req, res) => {
//   const allListings = await Listing.find({});
//   res.render("listings/index.ejs", { allListings });
// };

module.exports.index = async (req, res) => {
  const { category } = req.query;

  let allListings;

  if (category) {
    allListings = await Listing.find({ category });
  } else {
    allListings = await Listing.find({});
  }

  return res.render("listings/index.ejs", { allListings, category });
};

//new Route controller
module.exports.renderNewForm = (req, res) => {
  return res.render("listings/new.ejs");
};

//show Route
module.exports.showListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({
      path: "reviews", //nested populate
      populate: {
        path: "author",
      },
    })
    .populate("owner");
  console.log(listing);
  if (!listing) {
    req.flash("error", "Cannot find that listing");
    return res.redirect("/listings");
  }
  return res.render("listings/show.ejs", { listing });
};

//create Route
module.exports.createListing = async (req, res, next) => {
  try {
    if (!req.file) {
      req.flash("error", "Image is required to create a listing.");
      return res.redirect("/listings/new");
    }

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;

    const coords = await geocodeLocation(req.body.listing.location);

    newListing.geometry = {
      type: "Point",
      coordinates: coords,
    };

    newListing.image = {
      url: req.file.path,
      filename: req.file.filename,
    };

    await newListing.save();

    req.flash("success", "Successfully made a new listing");

    req.session.save(() => {
      res.redirect("/listings");
    });
  } catch (err) {
    console.error("CREATE LISTING ERROR:", err);
    return next(err);
  }
};

//edit Route controller will be added in routes/listing.js
module.exports.editListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Cannot find that listing");
    return res.redirect("/listings");
  }
  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_300,w_250"); //resize image to width 300px using cloudinary
  return res.render("listings/edit.ejs", { listing, originalImageUrl });
};

//update Route controller will be added in routes/listing.js
module.exports.updateListing = async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findByIdAndUpdate(
    id,
    { ...req.body.listing },
    { new: true }
  ); //Take all key–value pairs from this object and copy them here.
  //because in req.body does not save image info, we need to add it separately
  if (req.file) {
    // delete old image from cloudinary
    if (listing.image && listing.image.filename) {
      await cloudinary.uploader.destroy(listing.image.filename);
    }

    console.log(req.file);
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
    await listing.save();
  }

  req.flash("success", "Successfully updated a listing");
  return res.redirect(`/listings/${id}`);
};

//delete Route controller will be added in routes/listing.js
module.exports.deleteListing = async (req, res) => {
  let { id } = req.params;

  const listing = await Listing.findById(id);

  // delete image from cloudinary
  if (listing.image && listing.image.filename) {
    await cloudinary.uploader.destroy(listing.image.filename);
  }

  // delete listing from DB (this also triggers your review middleware)
  await Listing.findByIdAndDelete(id);

  req.flash("success", "Successfully deleted a listing");
  return res.redirect("/listings");
};

module.exports.search = async (req, res) => {
  const { q } = req.query;

  if (!q) {
    req.flash("error", "Please enter something to search");
    return res.redirect("/listings");
  }

  const regex = new RegExp(q, "i");

  const allListings = await Listing.find({
    $or: [{ title: regex }, { country: regex }],
  });

  return res.render("listings/index.ejs", { allListings, category: null });
};

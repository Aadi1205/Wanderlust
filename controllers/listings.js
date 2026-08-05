const mongoose = require("mongoose");
const Listing = require("../models/listing");
const User = require("../models/user.js");
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

const CATEGORIES = [
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
  "Boat",
];

//shared by index/search (full page) and filterListings (AJAX partial) so
//filters always behave identically across both entry points
function buildListingFilter(query) {
  const { category, owner, location, minPrice, maxPrice } = query;
  const filter = {};

  if (category) filter.category = category;
  if (owner && mongoose.Types.ObjectId.isValid(owner)) filter.owner = owner;
  if (location) filter.location = location;

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice && !isNaN(minPrice)) filter.price.$gte = Number(minPrice);
    if (maxPrice && !isNaN(maxPrice)) filter.price.$lte = Number(maxPrice);
  }

  return filter;
}

function buildListingSort(sort) {
  if (sort === "price_asc") return { price: 1 };
  if (sort === "price_desc") return { price: -1 };
  return {};
}

//dropdown options for the filter sidebar - derived from real listing data
//(owners/locations) plus the static category enum
async function getFilterOptions() {
  const ownerIds = await Listing.distinct("owner");
  const owners = await User.find({ _id: { $in: ownerIds } }, "username").sort(
    "username"
  );
  const locations = (await Listing.distinct("location"))
    .filter(Boolean)
    .sort();

  return { owners, locations, categories: CATEGORIES };
}

//creating a controller for listings (functions to be used in routes)
// module.exports.index = async (req, res) => {
//   const allListings = await Listing.find({});
//   res.render("listings/index.ejs", { allListings });
// };

module.exports.index = async (req, res) => {
  const { category, owner, location, minPrice, maxPrice, sort } = req.query;

  const allListings = await Listing.find(buildListingFilter(req.query)).sort(
    buildListingSort(sort)
  );
  const { owners, locations, categories } = await getFilterOptions();

  return res.render("listings/index.ejs", {
    allListings,
    category,
    owner,
    location,
    minPrice,
    maxPrice,
    sort,
    owners,
    locations,
    categories,
  });
};

//filter sidebar Route - returns rendered grid HTML + count so the client can
//swap it in without a full page reload
module.exports.filterListings = async (req, res) => {
  const { sort } = req.query;

  const allListings = await Listing.find(buildListingFilter(req.query)).sort(
    buildListingSort(sort)
  );

  res.render(
    "includes/listingsGrid.ejs",
    { allListings },
    (err, html) => {
      if (err) throw err;
      return res.json({ html, count: allListings.length });
    }
  );
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

//My Wishlist Route
module.exports.renderWishlist = async (req, res) => {
  const user = await User.findById(req.user._id).populate("wishlist");
  return res.render("listings/wishlist.ejs", { listings: user.wishlist });
};

//toggle wishlist Route
module.exports.toggleWishlist = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ success: false, message: "Listing not found" });
  }

  const listing = await Listing.findById(id);
  if (!listing) {
    return res.status(404).json({ success: false, message: "Listing not found" });
  }

  const user = await User.findById(req.user._id);
  const index = user.wishlist.findIndex((listingId) => listingId.equals(id));

  let wishlisted;
  if (index === -1) {
    user.wishlist.push(id);
    wishlisted = true;
  } else {
    user.wishlist.splice(index, 1);
    wishlisted = false;
  }
  await user.save();

  return res.json({ success: true, wishlisted });
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
  const { owners, locations, categories } = await getFilterOptions();

  return res.render("listings/index.ejs", {
    allListings,
    category: null,
    owner: null,
    location: null,
    minPrice: null,
    maxPrice: null,
    sort: null,
    owners,
    locations,
    categories,
  });
};

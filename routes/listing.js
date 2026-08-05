const express = require("express");
const router = express.Router();
const Listing = require("../models/listing");
const wrapAsync = require("../utils/wrapAsync.js");
const {
  isLoggedIn,
  isOwner,
  isOwnerRole,
  validateListing,
} = require("../middleware.js");
const listingsController = require("../controllers/listings.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

router
  .route("/")
  //index Route
  .get(wrapAsync(listingsController.index))
  //create Route
  .post(
    isLoggedIn,
    isOwnerRole,
    upload.single("listing[image]"), //multer middleware
    validateListing,
    wrapAsync(listingsController.createListing)
  );

//new Route
router.get("/new", isLoggedIn, isOwnerRole, listingsController.renderNewForm);

//search Route
router.get("/search", wrapAsync(listingsController.search));

//filter sidebar Route (AJAX partial)
router.get("/filter", wrapAsync(listingsController.filterListings));

//wishlist page Route
router.get("/wishlist", isLoggedIn, wrapAsync(listingsController.renderWishlist));

//show Route
router
  .route("/:id")
  //show Route
  .get(validateListing, wrapAsync(listingsController.showListing))
  //delete Route
  .delete(
    isLoggedIn,
    isOwnerRole,
    isOwner,
    wrapAsync(listingsController.deleteListing)
  )
  //put Route
  .put(
    isLoggedIn,
    isOwnerRole,
    isOwner,
    upload.single("listing[image]"), //multer middleware: multer parse img and save on cloudinary
    validateListing,
    wrapAsync(listingsController.updateListing)
  );

//edit Route
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwnerRole,
  isOwner,
  wrapAsync(listingsController.editListing)
);

//toggle wishlist Route
router.post(
  "/:id/wishlist/toggle",
  isLoggedIn,
  wrapAsync(listingsController.toggleWishlist)
);

module.exports = router;

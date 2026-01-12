const express = require("express");
const router = express.Router();
const Listing = require("../models/listing");
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
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
    upload.single("listing[image]"), //multer middleware
    validateListing,
    wrapAsync(listingsController.createListing)
  );

//new Route
router.get("/new", isLoggedIn, listingsController.renderNewForm);

//search Route
router.get("/search", wrapAsync(listingsController.search));

//show Route
router
  .route("/:id")
  //show Route
  .get(validateListing, wrapAsync(listingsController.showListing))
  //delete Route
  .delete(isLoggedIn, isOwner, wrapAsync(listingsController.deleteListing))
  //put Route
  .put(
    isLoggedIn,
    isOwner,
    upload.single("listing[image]"), //multer middleware: multer parse img and save on cloudinary
    validateListing,
    wrapAsync(listingsController.updateListing)
  );

//edit Route
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(listingsController.editListing)
);

module.exports = router;

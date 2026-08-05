const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const passport = require("passport");
const {
  saveRedirectUrl,
  isLoggedIn,
  isProfileOwner,
  validateProfile,
} = require("../middleware.js");
const usersController = require("../controllers/users.js");
const multer = require("multer");
const { avatarStorage } = require("../cloudConfig.js");
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, //3 MB
});

router
  .route("/signup")
  //get route for signup
  .get(usersController.renderSignupForm)

  //post route for signup
  .post(wrapAsync(usersController.signup));

router
  .route("/login")
  //get route for login
  .get(usersController.renderLoginForm)
  
  //post route for login
  .post(
    saveRedirectUrl,
    passport.authenticate("local", {
      failureFlash: true,
      failureRedirect: "/login",
    }),
    wrapAsync(usersController.login)
  );

//logout route
router.get("/logout", usersController.logout);

//show profile Route
router.get("/users/:id", wrapAsync(usersController.showProfile));

//edit profile Route
router.get(
  "/users/:id/edit",
  isLoggedIn,
  isProfileOwner,
  wrapAsync(usersController.renderEditProfile)
);

//update profile Route
router.put(
  "/users/:id",
  isLoggedIn,
  isProfileOwner,
  avatarUpload.single("avatar"), //multer middleware: must run before Joi or req.body is empty
  validateProfile,
  wrapAsync(usersController.updateProfile)
);

//delete avatar Route
router.delete(
  "/users/:id/avatar",
  isLoggedIn,
  isProfileOwner,
  wrapAsync(usersController.deleteAvatar)
);

//become-a-host Route
router
  .route("/become-a-host")
  .get(isLoggedIn, usersController.renderBecomeHost)
  .post(isLoggedIn, wrapAsync(usersController.becomeHost));

module.exports = router;

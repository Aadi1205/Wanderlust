const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");
const usersController = require("../controllers/users.js");

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

module.exports = router;

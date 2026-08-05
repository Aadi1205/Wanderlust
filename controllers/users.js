const mongoose = require("mongoose");
const User = require("../models/user.js");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const { cloudinary } = require("../cloudConfig.js");

//signup route
module.exports.signup = async (req, res) => {
  try {
    let { username, email, password } = req.body;
    const newUser = new User({ email, username });
    const registeredUser = await User.register(newUser, password); //password //pbkdf2 hashing algo
    console.log(registeredUser);
    //automatically login after sign up
    req.login(registeredUser, (err) => {
      if (err) {
        return next(err);
      }
      req.flash("success", "Welcome to WanderLust!");
      res.redirect("/listings");
    });
  } catch (err) {
    req.flash("error", err.message);
    return res.redirect("/signup");
  }
};

//login route
module.exports.renderLoginForm = (req, res) => {
  return res.render("users/login.ejs");
};

// GET signup form
module.exports.renderSignupForm = (req, res) => {
  return res.render("users/signup.ejs");
};


//post route for login is handled in routes/user.js directly
module.exports.login = async (req, res) => {
  req.flash("success", "Welcome back!");
  return res.redirect(res.locals.redirectUrl || "/listings");
};

//logout route
module.exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    } else {
      req.flash("success", "You are logged out now!");
     return res.redirect("/listings");
    }
  });
};

//show profile route
module.exports.showProfile = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Cannot find that user");
    return res.redirect("/listings");
  }

  const profileUser = await User.findById(id);
  if (!profileUser) {
    req.flash("error", "Cannot find that user");
    return res.redirect("/listings");
  }

  const listings = await Listing.find({ owner: id }).sort({ _id: -1 });

  const reviews = await Review.find({ author: id })
    .sort({ createdAt: -1 })
    .limit(10);

  //reviews don't store a listing back-ref, so resolve each review to its listing
  const reviewIds = reviews.map((review) => review._id);
  const listingsWithReview = await Listing.find({
    reviews: { $in: reviewIds },
  }).select("title reviews");

  const reviewListingMap = {};
  listingsWithReview.forEach((listing) => {
    listing.reviews.forEach((reviewId) => {
      reviewListingMap[reviewId.toString()] = listing;
    });
  });

  return res.render("users/profile.ejs", {
    profileUser,
    listings,
    reviews,
    reviewListingMap,
  });
};

//edit profile route
module.exports.renderEditProfile = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Cannot find that user");
    return res.redirect("/listings");
  }

  const profileUser = await User.findById(id);
  if (!profileUser) {
    req.flash("error", "Cannot find that user");
    return res.redirect("/listings");
  }

  return res.render("users/editProfile.ejs", { profileUser });
};

//update profile route
module.exports.updateProfile = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Cannot find that user");
    return res.redirect("/listings");
  }

  const profileUser = await User.findById(id);
  if (!profileUser) {
    req.flash("error", "Cannot find that user");
    return res.redirect("/listings");
  }

  const { fullName, email, location, bio } = req.body.user;
  profileUser.fullName = fullName;
  profileUser.email = email;
  profileUser.location = location;
  profileUser.bio = bio;

  if (req.file) {
    // delete old avatar from cloudinary
    if (profileUser.avatar && profileUser.avatar.filename) {
      await cloudinary.uploader.destroy(profileUser.avatar.filename);
    }
    profileUser.avatar = { url: req.file.path, filename: req.file.filename };
  }

  try {
    await profileUser.save();
  } catch (err) {
    if (err.code === 11000) {
      req.flash("error", "That email is already in use");
      return res.redirect(`/users/${id}/edit`);
    }
    throw err;
  }

  req.flash("success", "Successfully updated your profile");
  return res.redirect(`/users/${id}`);
};

//delete avatar route
module.exports.deleteAvatar = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Cannot find that user");
    return res.redirect("/listings");
  }

  const profileUser = await User.findById(id);
  if (!profileUser) {
    req.flash("error", "Cannot find that user");
    return res.redirect("/listings");
  }

  if (profileUser.avatar && profileUser.avatar.filename) {
    await cloudinary.uploader.destroy(profileUser.avatar.filename);
  }
  profileUser.avatar = undefined;
  await profileUser.save();

  req.flash("success", "Profile photo removed");
  return res.redirect(`/users/${id}/edit`);
};

//show become-a-host explainer
module.exports.renderBecomeHost = (req, res) => {
  if (res.locals.currUser.role === "owner") {
    return res.redirect("/listings/new");
  }
  return res.render("users/becomeHost.ejs");
};

//upgrade a customer to owner
module.exports.becomeHost = async (req, res) => {
  const user = res.locals.currUser;
  user.role = "owner";
  user.hostSince = new Date();
  await user.save();

  req.flash("success", "You're now a host! Start by creating your first listing.");
  return res.redirect("/listings/new");
};

const User = require("../models/user.js");

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

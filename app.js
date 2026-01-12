if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

//routes
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

//config

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
//serving static file (public)
app.use(express.static(path.join(__dirname, "public")));

//const MONGO_URL = "mongodb://127.0.0.1:27017/wanderLust";
const dbUrl = process.env.ATLAS_DB_URL;

const store = MongoStore.create({
  mongoUrl: dbUrl,
  secret: process.env.SESSION_SECRET,
  touchAfter: 24 * 60 * 60, //time period in seconds
  //by default exipres after 14 days
});

store.on("error", () => {
  console.log("Mongo session store error", err);
});

//use sessions
const sessionOptions = {
  store,
  secret: process.env.SESSION_SECRET || process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
};

app.use(session(sessionOptions));
app.use(flash());

//Passport-local-mongoose
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate())); //local strategy auth.

passport.serializeUser(User.serializeUser()); //to store user info in session
passport.deserializeUser(User.deserializeUser()); //to remove user info from session

async function main() {
  await mongoose.connect(dbUrl); //connect to mongodb atlas
}
//use main func
main()
  .then(() => {
    console.log("connected to mongodb");
  })
  .catch((err) => {
    console.log(err);
  });

// app.get("/", (req, res) => {
//   res.send("working root");
// });

//middleware
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  //console.log(res.locals.success);
  res.locals.currUser = req.user;
  next();
});

//-----Listings-----
app.use("/listings", listingRouter);

//-----Reviews-----
app.use("/listings/:id/reviews", reviewRouter);

//-----User-----
// use user routes
app.use("/", userRouter);

//Middleware
app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const { statusCode = 500 } = err;
  res.status(statusCode).render("error.ejs", { err });
});

app.listen(8080, () => {
  console.log("listening on port 8080");
});

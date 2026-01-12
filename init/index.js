const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderLust";

// --------------------
// MongoDB connection
// --------------------
async function main() {
  await mongoose.connect(MONGO_URL);
}

main()
  .then(() => console.log("connected to mongodb"))
  .catch((err) => console.log(err));

// --------------------
// Geocoding helper
// Uses Node 18+ built-in fetch
// --------------------
async function geocodeLocation(location) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        location
      )}`
    );

    const data = await res.json();

    if (data.length > 0) {
      return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
    }
  } catch (err) {
    console.error("Geocoding failed for:", location, err.message);
  }

  // fallback → Delhi
  return [77.2090, 28.6139];
}

// --------------------
// Seed database
// --------------------
const initDB = async () => {
  await Listing.deleteMany({});

  const listingsWithGeometry = [];

  for (let obj of initData.data) {
    const coords = await geocodeLocation(obj.location);

    listingsWithGeometry.push({
      ...obj,
      category: obj.category || "Trending",
      owner: "695d3d32bf1278467c050346",
      geometry: {
        type: "Point",
        coordinates: coords,
      },
    });
  }

  await Listing.insertMany(listingsWithGeometry);
  console.log("data was initialized with geometry 🌍");
};

initDB();


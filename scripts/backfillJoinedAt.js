// One-off script: run with `node scripts/backfillJoinedAt.js`
// Sets joinedAt for existing users that predate the profile feature.
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const mongoose = require("mongoose");
const User = require("../models/user.js");

async function main() {
  await mongoose.connect(process.env.ATLAS_DB_URL);

  const result = await User.updateMany(
    { joinedAt: { $exists: false } },
    { $set: { joinedAt: new Date() } }
  );

  console.log(`Backfilled joinedAt for ${result.modifiedCount} user(s)`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

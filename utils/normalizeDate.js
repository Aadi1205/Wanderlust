//normalizes any date (or "YYYY-MM-DD" string) to UTC midnight for that calendar
//day, so a booking always lands on the date the guest picked regardless of
//server/client timezone (using local getters here could roll the date back
//a day for late-night IST bookings on a server west of UTC).
module.exports = function toUTCMidnight(input) {
  const d = new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

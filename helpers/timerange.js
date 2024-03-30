function normalizeTimeToRangeStart(e, t) {
  var a = new Date(e);
  switch (t) {
   case "1h":
    a.setMinutes(a.getMinutes() - a.getMinutes() % 5), a.setSeconds(0), a.setMilliseconds(0);
    break;

   case "1d":
    a.setHours(0, 0, 0, 0);
    break;

   case "3d":
    a.setDate(a.getDate() - 2), a.setHours(0, 0, 0, 0);
    break;

   case "7d":
   case "1w":
    a.setDate(a.getDate() - a.getDay()), a.setHours(0, 0, 0, 0);
    break;

   case "1m":
    a.setDate(1), a.setHours(0, 0, 0, 0);
    break;

   default:
    throw new Error("Unsupported time range: " + t);
  }
  return a.toISOString();
}

module.exports = {
  normalizeTimeToRangeStart: normalizeTimeToRangeStart
};
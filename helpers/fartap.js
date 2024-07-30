var moment = require("moment-timezone");

const memcache = require("../connectmemcache")["memcache"], getFartapKey = async () => "fartap:game", getFartapScoreType = async () => "fartap", getFarscore = e => e <= 1 ? 1500 : e <= 5 ? 500 : e <= 10 ? 250 : e <= 25 ? 100 : e <= 50 ? 50 : e <= 100 ? 25 : e <= 2500 ? 10 : 0;

module.exports = {
  getFartapKey: getFartapKey,
  getFartapScoreType: getFartapScoreType,
  getFarscore: getFarscore
};
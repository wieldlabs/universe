var moment = require("moment-timezone");

const memcache = require("../connectmemcache")["memcache"], getFartapKey = async () => "fartap:game", getFartapScoreType = async () => "fartap", getFarscore = e => e <= 1 ? 1500 : e <= 10 ? 500 : e <= 20 ? 250 : e <= 50 ? 100 : e <= 100 ? 50 : e <= 250 ? 25 : 0;

module.exports = {
  getFartapKey: getFartapKey,
  getFartapScoreType: getFartapScoreType,
  getFarscore: getFarscore
};
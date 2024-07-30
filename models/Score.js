const mongoose = require("mongoose"), schema = require("../schemas/score")["schema"], memcache = require("../connectmemcache")["memcache"], padWithZeros = e => {
  for (;e.length < 32; ) e = "0" + e;
  return e;
};

class ScoreClass {
  static ping() {
    console.log("model: ScoreClass");
  }
  static async getLeaderboard(e, o = 10) {
    try {
      var r = await memcache.get(`Score:getLeaderboard:${e}:` + o);
      if (r) return JSON.parse(r.value);
    } catch (e) {
      console.error(e);
    }
    r = (await Score.aggregate([ {
      $match: {
        scoreType: e
      }
    }, {
      $sort: {
        score: -1
      }
    }, {
      $limit: parseInt(o)
    } ])).map(e => ({
      ...e,
      score: e.score.replace(/^0+/, "")
    }));
    return await memcache.set(`Score:getLeaderboard:${e}:` + o, JSON.stringify(r), {
      lifetime: 60
    }), JSON.parse(JSON.stringify(r));
  }
}

schema.post("find", function(e) {
  for (var o of e) o.score = o.score.replace(/^0+/, "");
}), schema.post("findOne", function(e) {
  e && (e.score = e.score.replace(/^0+/, ""));
}), schema.loadClass(ScoreClass);

const Score = mongoose.models.Score || mongoose.model("Score", schema);

module.exports = {
  Score: Score,
  padWithZeros: padWithZeros
};
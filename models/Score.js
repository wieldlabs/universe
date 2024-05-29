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
      var c = await memcache.get(`ScoreClass:getLeaderboard:${e}:` + o);
      if (c) return JSON.parse(c.value);
    } catch (e) {
      console.error(e);
    }
    c = (await Score.aggregate([ {
      $match: {
        scoreType: e
      }
    }, {
      $sort: {
        score: -1
      }
    }, {
      $lookup: {
        from: "accountaddresses",
        localField: "address",
        foreignField: "address",
        as: "accountAddress"
      }
    }, {
      $unwind: "$accountAddress"
    }, {
      $lookup: {
        from: "accounts",
        localField: "accountAddress.account",
        foreignField: "_id",
        as: "account"
      }
    }, {
      $unwind: "$account"
    }, {
      $match: {
        "account.recoverers": {
          $exists: !0,
          $not: {
            $size: 0
          }
        }
      }
    }, {
      $limit: parseInt(o)
    }, {
      $project: {
        score: 1,
        address: 1,
        account: 1
      }
    } ])).map(e => ({
      ...e,
      score: e.score.replace(/^0+/, "")
    }));
    return await memcache.set(`ScoreClass:getLeaderboard:${e}:` + o, JSON.stringify(c), {
      lifetime: 3600
    }), JSON.parse(JSON.stringify(c));
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
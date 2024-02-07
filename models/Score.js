const mongoose = require("mongoose"), schema = require("../schemas/score")["schema"], getMemcachedClient = require("../connectmemcached")["getMemcachedClient"], padWithZeros = e => {
  for (;e.length < 32; ) e = "0" + e;
  return e;
};

class ScoreClass {
  static ping() {
    console.log("model: ScoreClass");
  }
  static async getLeaderboard(e, o = 10) {
    var c = getMemcachedClient();
    try {
      var r = await c.get(`ScoreClass:getLeaderboard:${e}:` + o);
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
    try {
      await c.set(`ScoreClass:getLeaderboard:${e}:` + o, JSON.stringify(r), {
        lifetime: 3600
      });
    } catch (e) {
      console.error(e);
    }
    return JSON.parse(JSON.stringify(r));
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
const _CacheService = require("../services/cache/CacheService")["Service"], {
  Score,
  padWithZeros
} = require("../models/Score"), validateAndConvertAddress = require("../helpers/validate-and-convert-address")["validateAndConvertAddress"];

class ScoreService {
  static async getScore(e, {}) {
    return 0;
  }
  async _setScoreRecord({
    address: e,
    scoreType: r,
    score: s = 0,
    description: a,
    previousScore: o
  }) {
    return await new _CacheService().setWithDupe({
      key: "BebScoreServiceRecord",
      params: {
        address: e,
        scoreType: r
      },
      value: {
        score: s,
        description: a,
        previousScore: o
      }
    });
  }
  async _setHighestScore({
    address: e,
    scoreType: r,
    modifier: s = 0
  }) {
    var a, o, t;
    if (s && !(s < 0)) return (t = await (a = new _CacheService()).get({
      key: o = "BebScoreService",
      params: {
        address: e,
        scoreType: r
      }
    })) ? (t = Math.max(parseInt(t) + s, parseInt(t)), a.set({
      key: o,
      params: {
        address: e,
        scoreType: r
      },
      value: t
    })) : a.set({
      key: o,
      params: {
        address: e,
        scoreType: r
      },
      value: s
    });
  }
  async setScore({
    address: e,
    scoreType: r,
    score: s = 0,
    modifier: a = null,
    description: o = null,
    shouldRecord: t = !0
  }) {
    e = validateAndConvertAddress(e);
    let d = s, c = 0;
    return null !== a && (c = await this.getCommunityScore({
      address: e,
      bebdomain: r
    }), d = c ? parseInt(c) + a : s + a), d = Math.min(Math.max(d, 0), Number.MAX_SAFE_INTEGER), 
    t && this._setScoreRecord({
      address: e,
      scoreType: r,
      score: d,
      description: o,
      previousScore: c
    }), this._setHighestScore({
      address: e,
      scoreType: r,
      modifier: a
    }), Score.updateOne({
      address: e,
      scoreType: r
    }, {
      address: e,
      scoreType: r,
      score: padWithZeros(d.toString())
    }, {
      upsert: !0
    });
  }
  async getCommunityScore({
    address: e,
    bebdomain: r
  }) {
    var s = new _CacheService(), e = validateAndConvertAddress(e), a = await Score.findOne({
      address: e,
      scoreType: r
    });
    return a ? parseInt(a.score) : await s.get({
      key: "BebScoreService",
      params: {
        address: e,
        scoreType: r
      }
    }) || 0;
  }
  async getPosition({
    address: e,
    bebdomain: r
  }) {
    e = validateAndConvertAddress(e), e = await Score.findOne({
      address: e,
      scoreType: r
    }), e = e ? e.score : 0;
    return await Score.countDocuments({
      scoreType: r,
      score: {
        $gt: padWithZeros(e.toString())
      }
    }) + 1;
  }
  async addXP({
    address: e,
    xp: r,
    overloadPerPeriod: s,
    periodInDays: a = 1,
    overloadMultiplier: o = .1,
    type: t
  }) {
    var e = validateAndConvertAddress(e), d = await this.getCommunityScore({
      address: e,
      bebdomain: t
    }), c = new Date(), a = (c.setDate(c.getDate() - a), await this._getRecentXP(e, t, c));
    let i = r;
    c = d + (i = s < a + r ? s - a + (a + r - s) * o : i);
    return await this.setScore({
      address: e,
      scoreType: t,
      score: c,
      description: `Added ${i} XP (${r} original)`
    }), c;
  }
  async _getRecentXP(e, r, s) {
    e = await new _CacheService().find({
      key: "BebScoreServiceRecord",
      params: {
        address: e,
        scoreType: r
      },
      createdAt: {
        $gte: s
      }
    });
    let a = 0;
    if (e) for (const o of e) a += o.score - (o.previousScore || 0);
    return a;
  }
}

module.exports = {
  Service: ScoreService
};
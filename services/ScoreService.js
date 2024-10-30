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
    previousScore: t
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
        previousScore: t
      }
    });
  }
  async _setHighestScore({
    address: e,
    scoreType: r,
    modifier: s = 0
  }) {
    var a, t, d;
    if (s && !(s < 0)) return (d = await (a = new _CacheService()).get({
      key: t = "BebScoreService",
      params: {
        address: e,
        scoreType: r
      }
    })) ? (d = Math.max(parseInt(d) + s, parseInt(d)), a.set({
      key: t,
      params: {
        address: e,
        scoreType: r
      },
      value: d
    })) : a.set({
      key: t,
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
    description: t = null,
    shouldRecord: d = !0
  }) {
    e = validateAndConvertAddress(e);
    let o = s, c = 0;
    return null !== a && (c = await this.getCommunityScore({
      address: e,
      bebdomain: r
    }), o = c ? parseInt(c) + a : s + a), o = Math.min(Math.max(o, 0), Number.MAX_SAFE_INTEGER), 
    d && this._setScoreRecord({
      address: e,
      scoreType: r,
      score: o,
      description: t,
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
      score: padWithZeros(o.toString())
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
    overloadMultiplier: t = .1,
    type: d
  }) {
    var e = validateAndConvertAddress(e), o = (await this.getCommunityScore({
      address: e,
      bebdomain: d
    }), new Date()), a = (o.setDate(o.getDate() - a), await this._getRecentXP(e, d, o));
    let c = Math.max(r, 0);
    return 0 < (c = s < a + r ? Math.max(r * t, 0) : c) && await this.setScore({
      address: e,
      scoreType: d,
      modifier: c,
      description: `Added ${c} XP (${r} original)`
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
    if (e) for (const t of e) a += t.score - (t.previousScore || 0);
    return a;
  }
}

module.exports = {
  Service: ScoreService
};
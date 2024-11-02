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
    previousScore: d
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
        previousScore: d
      }
    });
  }
  async _setHighestScore({
    address: e,
    scoreType: r,
    modifier: s = 0
  }) {
    var a, d, o;
    if (s && !(s < 0)) return (o = await (a = new _CacheService()).get({
      key: d = "BebScoreService",
      params: {
        address: e,
        scoreType: r
      }
    })) ? (o = Math.max(parseInt(o) + s, parseInt(o)), a.set({
      key: d,
      params: {
        address: e,
        scoreType: r
      },
      value: o
    })) : a.set({
      key: d,
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
    description: d = null,
    shouldRecord: o = !0
  }) {
    e = validateAndConvertAddress(e);
    let t = s, c = 0;
    return null !== a && (c = await this.getCommunityScore({
      address: e,
      bebdomain: r
    }), t = c ? parseInt(c) + a : s + a), t = Math.min(Math.max(t, 0), Number.MAX_SAFE_INTEGER), 
    o && this._setScoreRecord({
      address: e,
      scoreType: r,
      score: t,
      description: d,
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
      score: padWithZeros(t.toString())
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
    return a ? void 0 === a.score || isNaN(parseInt(a.score)) ? 0 : parseInt(a.score) : await s.get({
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
    return await Score.find({
      scoreType: r,
      score: {
        $gt: padWithZeros(e.toString())
      }
    }).count() + 1;
  }
  async addXP({
    address: e,
    xp: r,
    overloadPerPeriod: s,
    periodInDays: a = 1,
    overloadMultiplier: d = .1,
    type: o
  }) {
    var e = validateAndConvertAddress(e), t = (await this.getCommunityScore({
      address: e,
      bebdomain: o
    }), new Date()), a = (t.setDate(t.getDate() - a), await this._getRecentXP(e, o, t));
    let c = Math.max(r, 0);
    return 0 < (c = s < a + r ? Math.max(r * d, 0) : c) && await this.setScore({
      address: e,
      scoreType: o,
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
    if (e) for (const d of e) a += d.score - (d.previousScore || 0);
    return a;
  }
}

module.exports = {
  Service: ScoreService
};
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
    description: a
  }) {
    return await new _CacheService().setWithDupe({
      key: "BebScoreServiceRecord",
      params: {
        address: e,
        scoreType: r
      },
      value: {
        score: s,
        description: a
      }
    });
  }
  async _setHighestScore({
    address: e,
    scoreType: r,
    modifier: s = 0
  }) {
    var a, c, d;
    if (s && !(s < 0)) return (d = await (a = new _CacheService()).get({
      key: c = "BebScoreService",
      params: {
        address: e,
        scoreType: r
      }
    })) ? (d = Math.max(parseInt(d) + s, parseInt(d)), a.set({
      key: c,
      params: {
        address: e,
        scoreType: r
      },
      value: d
    })) : a.set({
      key: c,
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
    description: c = null,
    shouldRecord: d = !0
  }) {
    var o, e = validateAndConvertAddress(e);
    let t = s;
    return null !== a && (o = await this.getCommunityScore({
      address: e,
      bebdomain: r
    }), t = o ? parseInt(o) + a : s + a), t = Math.min(Math.max(t, 0), Number.MAX_SAFE_INTEGER), 
    d && this._setScoreRecord({
      address: e,
      scoreType: r,
      score: t,
      description: c
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
}

module.exports = {
  Service: ScoreService
};
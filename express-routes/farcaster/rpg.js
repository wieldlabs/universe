const app = require("express").Router(), Sentry = require("@sentry/node"), rateLimit = require("express-rate-limit"), _FarcasterRpgService = require("../../services/farcaster/FarcasterRpgService")["Service"], authContext = require("../../helpers/express-middleware")["authContext"], heavyLimiter = rateLimit({
  windowMs: 6e4,
  max: 50,
  message: "Too many requests! See docs.far.quest for more info.",
  validate: {
    limit: !1
  }
}), lightLimiter = rateLimit({
  windowMs: 6e4,
  max: 100,
  message: "Too many requests! See docs.far.quest for more info.",
  validate: {
    limit: !1
  }
});

app.post("/v1/summon", [ authContext, heavyLimiter ], async (e, t) => {
  var {
    type: r,
    method: s
  } = e.body, a = new _FarcasterRpgService();
  try {
    var {
      monster: o,
      newScore: i
    } = await a.summonMonster({
      type: r,
      method: s
    }, e.context);
    return t.json({
      success: !0,
      monster: o,
      score: i
    });
  } catch (e) {
    return Sentry.captureException(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/quests", [ authContext, heavyLimiter ], async (e, t) => {
  var r = e.body["questId"], s = new _FarcasterRpgService();
  try {
    return await s.claimQuestReward({
      questId: r
    }, e.context), t.json({
      success: !0
    });
  } catch (e) {
    return Sentry.captureException(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/player", [ authContext, lightLimiter ], async (e, t) => {
  var r = new _FarcasterRpgService(), s = e.query["sort"];
  try {
    var {
      monsters: a,
      items: o,
      player: i,
      totalRefCount: n
    } = await r.getGameState({
      sort: s
    }, e.context);
    return t.json({
      success: !0,
      monsters: a,
      items: o,
      player: i,
      totalRefCount: n
    });
  } catch (e) {
    return Sentry.captureException(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), module.exports = {
  router: app
};
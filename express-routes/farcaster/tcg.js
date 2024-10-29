const app = require("express").Router(), Sentry = require("@sentry/node"), rateLimit = require("express-rate-limit"), _FarcasterTcgService = require("../../services/farcaster/FarcasterTcgService")["Service"], {
  Player,
  Match
} = require("../../models/farcaster/tcg"), authContext = require("../../helpers/express-middleware")["authContext"], heavyLimiter = rateLimit({
  windowMs: 6e4,
  max: 150,
  message: "Too many requests! See docs.wield.xyz for more info.",
  validate: {
    limit: !1
  }
}), lightLimiter = rateLimit({
  windowMs: 6e4,
  max: 1e3,
  message: "Too many requests! See docs.wield.xyz for more info.",
  validate: {
    limit: !1
  }
}), applyFogOfWarToMatch = e => {
  const t = JSON.parse(JSON.stringify(e));
  e = t.rounds[t.rounds.length - 1];
  if ("Shop" === e.state) {
    for (const a of e.actions) a.playersHand[1] = [], a.playersField[1] = [], a.playersHealth[1] = 0, 
    a.playersEnergy[1] = 0, a.playersShop[1] = [];
    e.actions = e.actions.filter(e => e.player !== t.players[1]);
  }
  for (let e = 0; e < t.rounds.length - 1; e++) t.rounds[e] = {};
  return t;
};

app.post("/v1/unbox", [ authContext, heavyLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var {
    type: a,
    method: s,
    set: c,
    handleId: r,
    packId: n
  } = e.body, o = new _FarcasterTcgService();
  try {
    var u = await o.unboxCard({
      type: a,
      method: s,
      set: c,
      handleId: r,
      packId: n
    }, e.context);
    return t.json({
      success: !0,
      ...u
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/quests", [ authContext, heavyLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var a = e.body["questId"], s = new _FarcasterTcgService();
  try {
    var c = await s.claimQuestReward({
      questId: a
    }, e.context);
    return t.json({
      success: !0,
      ...c
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/leaderboard", [ authContext, lightLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var {
    limit: e = 100
  } = e.query, a = new _FarcasterTcgService();
  try {
    var s = await a.getLeaderboard({
      limit: e
    });
    return t.json({
      success: !0,
      leaderboard: s
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/player", [ authContext, heavyLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var a = new _FarcasterTcgService();
  try {
    var s = await a.getGameState(e.context);
    return t.json({
      success: !0,
      ...s
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/player/position", [ authContext, heavyLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var a = new _FarcasterTcgService();
  try {
    var s = await a.getPlayerPosition({
      context: e.context
    });
    return t.json({
      success: !0,
      position: s
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/player/favorite/add", [ authContext, heavyLimiter ], async (e, t) => {
  var a = e.body["playableCardId"], s = new _FarcasterTcgService(), e = await Player.findOne({
    account: e.context.account._id
  });
  try {
    return e = await s.addFavorite(e, a), t.json({
      success: !0,
      player: e
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.delete("/v1/player/favorite/remove", [ authContext, heavyLimiter ], async (e, t) => {
  var a = e.body["playableCardId"], s = new _FarcasterTcgService(), e = await Player.findOne({
    account: e.context.account._id
  });
  try {
    return e = await s.removeFavorite(e, a), t.json({
      success: !0,
      player: e
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/match/start", [ authContext, heavyLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var {
    isBot: a,
    botOpponent: s
  } = e.body, c = new _FarcasterTcgService();
  try {
    var r = await Player.find({
      account: {
        $in: [ e.context.account?._id ]
      }
    }), n = await c.startMatch({
      players: r,
      isBot: a,
      botOpponent: s
    }), n = await c.syncMatch({
      match: n
    });
    return t.json({
      success: !0,
      match: applyFogOfWarToMatch(n)
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/match/sync", [ authContext, lightLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var a = e.body["matchId"], s = new _FarcasterTcgService();
  try {
    var c = await Match.findById(a), r = await Player.findOne({
      account: e.context.account._id
    }), n = await s.syncMatch({
      match: c,
      player: r
    });
    return t.json({
      success: !0,
      match: applyFogOfWarToMatch(n)
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/match/advance", [ authContext, lightLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var a = e.body["matchId"], s = new _FarcasterTcgService();
  try {
    var c = await Match.findById(a), r = await Player.findOne({
      account: e.context.account._id
    }), c = await s.advanceMatch({
      match: c,
      player: r
    });
    return c = await s.syncMatch({
      match: c
    }), t.json({
      success: !0,
      match: applyFogOfWarToMatch(c)
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/match/action/add", [ authContext, heavyLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var {
    matchId: a,
    sourceCardIdx: s,
    targetCardIdx: c,
    actionType: r
  } = e.body, n = new _FarcasterTcgService();
  try {
    var o = await Match.findById(a), u = await Player.findOne({
      account: e.context.account._id
    }), i = await n.addAction({
      match: o,
      player: u,
      sourceCardIdx: s,
      targetCardIdx: c,
      actionType: r
    });
    return t.json({
      success: !0,
      match: applyFogOfWarToMatch(i)
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/match/quit", [ authContext, heavyLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var a = e.body["matchId"], s = new _FarcasterTcgService();
  try {
    var c = await Match.findById(a), r = await Player.findOne({
      account: e.context.account._id
    }), n = await s.quitMatch({
      match: c,
      player: r
    });
    return t.json({
      success: !0,
      match: n
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/all-cards", [ authContext, heavyLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  e = new _FarcasterTcgService();
  try {
    var {
      cards: a,
      unboxingOdds: s
    } = await e.getAllCards();
    return t.json({
      success: !0,
      cards: a,
      unboxingOdds: s
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/buy-rented-pack", [ authContext, lightLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var {
    packType: a,
    quantity: s
  } = e.body, c = new _FarcasterTcgService();
  try {
    var r = await c.buyRentedPack({
      packType: a,
      quantity: s
    }, e.context);
    return t.json({
      success: !0,
      player: r
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/inventory", [ authContext, heavyLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var a = new _FarcasterTcgService(), {
    limit: s,
    cursor: c,
    filters: r,
    sort: n
  } = e.query;
  try {
    await e.context.account.populate("addresses");
    var o = e.context.account.addresses[0].address?.toLowerCase(), u = await Player.findOne({
      account: e.context.account._id
    }), i = await a.getInventory({
      address: o,
      playerId: u._id,
      limit: parseInt(s) || 15,
      cursor: c,
      filters: r ? JSON.parse(r) : {},
      sort: n || "createdAt"
    });
    return t.json({
      success: !0,
      ...i
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/packs", [ authContext, heavyLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var a = new _FarcasterTcgService(), {
    limit: s,
    cursor: c,
    filters: r,
    sort: n
  } = e.query;
  try {
    await e.context.account.populate("addresses");
    var o = e.context.account.addresses[0].address?.toLowerCase(), u = await Player.findOne({
      account: e.context.account._id
    }), i = await a.getPacks({
      address: o,
      playerId: u._id,
      limit: parseInt(s) || 15,
      cursor: c,
      filters: r ? JSON.parse(r) : {},
      sort: n || "createdAt"
    });
    return t.json({
      success: !0,
      ...i
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/convert-handles", [ authContext, heavyLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var a = new _FarcasterTcgService();
  try {
    var s = await a.convertHandlesToPacks(null, e.context);
    return t.json({
      success: !0,
      ...s
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/apply-invite", [ authContext, heavyLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var a = new _FarcasterTcgService();
  try {
    var s, {
      inviteCode: c,
      referralType: r
    } = e.body;
    return c ? (s = await a.applyInvite({
      inviteCode: c.toString().trim(),
      referralType: r
    }, e.context), t.json(s)) : t.json({
      success: !1,
      message: "Missing inviteCode"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/complete-quest", [ authContext, heavyLimiter ], async (e, t) => {
  if (!e.context.account) return t.json({
    success: !1,
    message: "Account not found"
  });
  var a = new _FarcasterTcgService();
  try {
    var s, c = e.body["questId"];
    return c ? (s = await a.completeQuest(c, e.context), t.json(s)) : t.json({
      success: !1,
      message: "Missing questId"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      success: !1,
      message: e.message
    });
  }
}), module.exports = {
  router: app
};
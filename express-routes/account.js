const app = require("express").Router(), Sentry = require("@sentry/node"), Account = require("../models/Account")["Account"], AccountInventory = require("../models/AccountInventory")["AccountInventory"], _ScoreService = require("../services/ScoreService")["Service"], _AccountBookmarkService = require("../services/AccountBookmarkService")["Service"], {
  limiter,
  authContext
} = require("../helpers/express-middleware"), QuestService = require("../services/QuestService")["Service"];

app.get("/v1/inventory", limiter, async (r, c) => {
  try {
    var o, {
      address: a,
      limit: n,
      offset: i,
      sort: u,
      filters: d,
      fid: m,
      addCharacters: p,
      bebdomain: y
    } = r.query, l = new _ScoreService(), v = await Account.findByAddressAndChainId({
      address: a,
      chainId: 1
    });
    if (!v) throw new Error("Account not found");
    let e = {
      account: v._id
    };
    if (d) try {
      var S = JSON.parse(d);
      e = {
        ...e,
        ...S
      };
    } catch (e) {
      throw new Error("Invalid filters");
    }
    let [ t, s ] = await Promise.all([ AccountInventory.findAndSort({
      limit: n,
      offset: i,
      sort: u,
      filters: e
    }), "0" === i && l.getCommunityScore({
      address: a,
      bebdomain: y
    }) ]);
    "0" === i && (o = await AccountInventory.getExtraInventory({
      address: a,
      fid: m,
      addCharacters: p,
      score: s
    }), t = t.concat(o));
    const w = new QuestService();
    await Promise.all(t.map(async e => {
      var t;
      if (e.rewardId) return t = await w.getQuestReward({
        rewardId: e.rewardId,
        type: e.rewardType
      }), e.reward = {
        _id: e.rewardId,
        type: e.rewardType,
        item: t
      }, t;
    })), c.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      inventory: t
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), c.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/score", limiter, async (e, t) => {
  try {
    var {
      address: s,
      bebdomain: r
    } = e.query, c = await new _ScoreService().getCommunityScore({
      address: s,
      bebdomain: r
    });
    t.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      score: c
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), t.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/bookmarks", [ limiter, authContext ], async (e, t) => {
  try {
    var {
      type: s,
      limit: r,
      cursor: c
    } = e.query, [ o, a ] = await new _AccountBookmarkService().bookmarks(e.context.account?._id, {
      type: s,
      limit: r,
      cursor: c
    });
    t.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      bookmarks: o,
      next: a
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), t.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/bookmarks", [ limiter, authContext ], async (e, t) => {
  try {
    const {
      type: c,
      ...o
    } = e.body;
    var s = {
      account: e.context.account,
      accountId: e.context.account._id
    }, r = await new _AccountBookmarkService().createBookmark({
      type: c,
      ...o
    }, s);
    t.status(201).json({
      code: "201",
      success: !0,
      message: "Bookmark created successfully",
      bookmark: r
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), t.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/update", [ limiter, authContext ], async (e, t) => {
  try {
    var s = e.context.account;
    if (!s) throw new Error("Account not found");
    var {
      email: r,
      location: c,
      profileImageId: o,
      bio: a,
      isOnboarded: n,
      expoPushToken: i
    } = e.body, u = await s.updateMe({
      email: r,
      location: c,
      profileImageId: o,
      bio: a,
      isOnboarded: n,
      expoPushToken: i
    });
    t.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      account: u
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), t.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.delete("/v1/delete", [ limiter, authContext ], async (e, t) => {
  try {
    var s = e.context.account;
    if (!s) throw new Error("Account not found");
    await Account.deleteAllData({
      account: s
    }), t.status(201).json({
      code: "200",
      success: !0,
      message: "Success: account has been deleted!"
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), t.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), module.exports = {
  router: app
};
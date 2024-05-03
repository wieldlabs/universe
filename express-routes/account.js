const app = require("express").Router(), Sentry = require("@sentry/node"), Account = require("../models/Account")["Account"], AccountInventory = require("../models/AccountInventory")["AccountInventory"], _ScoreService = require("../services/ScoreService")["Service"], _AccountBookmarkService = require("../services/AccountBookmarkService")["Service"], {
  limiter,
  authContext
} = require("../helpers/express-middleware"), QuestService = require("../services/QuestService")["Service"];

app.get("/v1/inventory", limiter, async (t, s) => {
  try {
    var {
      address: c,
      limit: r,
      offset: o,
      sort: a,
      filters: n
    } = t.query, i = await Account.findByAddressAndChainId({
      address: c,
      chainId: 1
    });
    if (!i) throw new Error("Account not found");
    let e = {
      account: i._id
    };
    if (n) try {
      var u = JSON.parse(n);
      e = {
        ...e,
        ...u
      };
    } catch (e) {
      throw new Error("Invalid filters");
    }
    var d = await AccountInventory.findAndSort({
      limit: r,
      offset: o,
      sort: a,
      filters: e
    });
    const m = new QuestService();
    await Promise.all(d.map(async e => {
      var t;
      if (e.rewardId) return t = await m.getQuestReward({
        rewardId: e.rewardId,
        type: e.rewardType
      }), e.reward = {
        _id: e.rewardId,
        type: e.rewardType,
        item: t
      }, t;
    })), s.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      inventory: d
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/score", limiter, async (e, t) => {
  try {
    var {
      address: s,
      bebdomain: c
    } = e.query, r = await new _ScoreService().getCommunityScore({
      address: s,
      bebdomain: c
    });
    t.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      score: r
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
      limit: c,
      offset: r
    } = e.query, o = await new _AccountBookmarkService().bookmarks(e.context.account?._id, {
      type: s,
      limit: c,
      offset: r
    });
    t.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      bookmarks: o
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
      type: r,
      ...o
    } = e.body;
    var s = {
      account: e.context.account,
      accountId: e.context.account._id
    }, c = await new _AccountBookmarkService().createBookmark({
      type: r,
      ...o
    }, s);
    t.status(201).json({
      code: "201",
      success: !0,
      message: "Bookmark created successfully",
      bookmark: c
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
      email: c,
      location: r,
      profileImageId: o,
      bio: a,
      isOnboarded: n,
      expoPushToken: i
    } = e.body, u = await s.updateMe({
      email: c,
      location: r,
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
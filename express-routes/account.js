const app = require("express").Router(), Sentry = require("@sentry/node"), Account = require("../models/Account")["Account"], AccountInventory = require("../models/AccountInventory")["AccountInventory"], _ScoreService = require("../services/ScoreService")["Service"], _AccountBookmarkService = require("../services/AccountBookmarkService")["Service"], {
  limiter,
  authContext
} = require("../helpers/express-middleware"), QuestService = require("../services/QuestService")["Service"];

app.get("/v1/inventory", limiter, async (s, t) => {
  try {
    var {
      address: c,
      limit: r,
      offset: o,
      sort: a,
      filters: n
    } = s.query, u = await Account.findByAddressAndChainId({
      address: c,
      chainId: 1
    });
    if (!u) throw new Error("Account not found");
    let e = {
      account: u._id
    };
    if (n) try {
      var i = JSON.parse(n);
      e = {
        ...e,
        ...i
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
      var s;
      if (e.rewardId) return s = await m.getQuestReward({
        rewardId: e.rewardId,
        type: e.rewardType
      }), e.reward = {
        _id: e.rewardId,
        type: e.rewardType,
        item: s
      }, s;
    })), t.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      inventory: d
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), t.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/score", limiter, async (e, s) => {
  try {
    var {
      address: t,
      bebdomain: c
    } = e.query, r = await new _ScoreService().getCommunityScore({
      address: t,
      bebdomain: c
    });
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      score: r
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/bookmarks", [ limiter, authContext ], async (e, s) => {
  try {
    var {
      type: t,
      limit: c,
      cursor: r
    } = e.query, [ o, a ] = await new _AccountBookmarkService().bookmarks(e.context.account?._id, {
      type: t,
      limit: c,
      cursor: r
    });
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      bookmarks: o,
      next: a
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/bookmarks", [ limiter, authContext ], async (e, s) => {
  try {
    const {
      type: r,
      ...o
    } = e.body;
    var t = {
      account: e.context.account,
      accountId: e.context.account._id
    }, c = await new _AccountBookmarkService().createBookmark({
      type: r,
      ...o
    }, t);
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Bookmark created successfully",
      bookmark: c
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/update", [ limiter, authContext ], async (e, s) => {
  try {
    var t = e.context.account;
    if (!t) throw new Error("Account not found");
    var {
      email: c,
      location: r,
      profileImageId: o,
      bio: a,
      isOnboarded: n,
      expoPushToken: u
    } = e.body, i = await t.updateMe({
      email: c,
      location: r,
      profileImageId: o,
      bio: a,
      isOnboarded: n,
      expoPushToken: u
    });
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      account: i
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.delete("/v1/delete", [ limiter, authContext ], async (e, s) => {
  try {
    var t = e.context.account;
    if (!t) throw new Error("Account not found");
    await Account.deleteAllData({
      account: t
    }), s.status(201).json({
      code: "200",
      success: !0,
      message: "Success: account has been deleted!"
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), module.exports = {
  router: app
};
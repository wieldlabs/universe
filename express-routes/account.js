const app = require("express").Router(), Sentry = require("@sentry/node"), Account = require("../models/Account")["Account"], AccountInventory = require("../models/AccountInventory")["AccountInventory"], _ScoreService = require("../services/ScoreService")["Service"], {
  limiter,
  authContext
} = require("../helpers/express-middleware"), QuestService = require("../services/QuestService")["Service"];

app.get("/v1/inventory", limiter, async (r, s) => {
  try {
    var {
      address: t,
      limit: c,
      offset: o,
      sort: a,
      filters: n
    } = r.query, i = await Account.findByAddressAndChainId({
      address: t,
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
      limit: c,
      offset: o,
      sort: a,
      filters: e
    });
    const l = new QuestService();
    await Promise.all(d.map(async e => {
      var r;
      if (e.rewardId) return r = await l.getQuestReward({
        rewardId: e.rewardId,
        type: e.rewardType
      }), e.reward = {
        _id: e.rewardId,
        type: e.rewardType,
        item: r
      }, r;
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
}), app.get("/v1/score", limiter, async (e, r) => {
  try {
    var {
      address: s,
      bebdomain: t
    } = e.query, c = await new _ScoreService().getCommunityScore({
      address: s,
      bebdomain: t
    });
    r.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      score: c
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), r.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/update", [ limiter, authContext ], async (e, r) => {
  try {
    var s = e.context.account;
    if (!s) throw new Error("Account not found");
    var {
      email: t,
      location: c,
      wieldTag: o,
      profileImageId: a,
      bio: n,
      isOnboarded: i,
      expoPushToken: u
    } = e.body, d = await s.updateMe({
      email: t,
      location: c,
      wieldTag: o,
      profileImageId: a,
      bio: n,
      isOnboarded: i,
      expoPushToken: u
    });
    r.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      account: d
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), r.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.delete("/v1/delete", [ limiter, authContext ], async (e, r) => {
  try {
    var s = e.context.account;
    if (!s) throw new Error("Account not found");
    await Account.deleteAllData({
      account: s
    }), r.status(201).json({
      code: "200",
      success: !0,
      message: "Success: account has been deleted!"
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), r.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), module.exports = {
  router: app
};
const app = require("express").Router(), Sentry = require("@sentry/node"), Account = require("../models/Account")["Account"], AccountInventory = require("../models/AccountInventory")["AccountInventory"], _ScoreService = require("../services/ScoreService")["Service"], _AccountBookmarkService = require("../services/AccountBookmarkService")["Service"], {
  limiter,
  authContext
} = require("../helpers/express-middleware"), QuestService = require("../services/QuestService")["Service"], Referral = require("../models/Referral")["Referral"], memcache = require("../connectmemcache")["memcache"];

app.get("/v1/inventory", limiter, async (t, c) => {
  try {
    var a, {
      address: o,
      limit: n,
      offset: i,
      sort: u,
      filters: d,
      fid: m,
      addCharacters: l,
      bebdomain: p
    } = t.query, y = new _ScoreService(), f = await Account.findByAddressAndChainId({
      address: o,
      chainId: 1
    });
    if (!f) throw new Error("Account not found");
    let e = {
      account: f._id
    };
    if (d) try {
      var v = JSON.parse(d);
      e = {
        ...e,
        ...v
      };
    } catch (e) {
      throw new Error("Invalid filters");
    }
    let [ r, s ] = await Promise.all([ AccountInventory.findAndSort({
      limit: n,
      offset: i,
      sort: u,
      filters: e
    }), "0" === i && y.getCommunityScore({
      address: o,
      bebdomain: p
    }) ]);
    "0" === i && (a = await AccountInventory.getExtraInventory({
      address: o,
      fid: m,
      addCharacters: l,
      score: s
    }), r = r.concat(a));
    const w = new QuestService();
    await Promise.all(r.map(async e => {
      var r;
      if (e.rewardId) return r = await w.getQuestReward({
        rewardId: e.rewardId,
        type: e.rewardType
      }), e.reward = {
        _id: e.rewardId,
        type: e.rewardType,
        item: r
      }, r;
    })), c.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      inventory: r
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), c.status(500).json({
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
}), app.get("/v1/bookmarks", [ limiter, authContext ], async (e, r) => {
  try {
    var {
      type: s,
      limit: t,
      cursor: c
    } = e.query, [ a, o ] = await new _AccountBookmarkService().bookmarks(e.context.account?._id, {
      type: s,
      limit: t,
      cursor: c
    });
    r.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      bookmarks: a,
      next: o
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), r.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/bookmarks", [ limiter, authContext ], async (e, r) => {
  try {
    const {
      type: c,
      ...a
    } = e.body;
    var s = {
      account: e.context.account,
      accountId: e.context.account._id
    }, t = await new _AccountBookmarkService().createBookmark({
      type: c,
      ...a
    }, s);
    r.status(201).json({
      code: "201",
      success: !0,
      message: "Bookmark created successfully",
      bookmark: t
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
      profileImageId: a,
      bio: o,
      isOnboarded: n,
      expoPushToken: i
    } = e.body, u = await s.updateMe({
      email: t,
      location: c,
      profileImageId: a,
      bio: o,
      isOnboarded: n,
      expoPushToken: i
    });
    r.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      account: u
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
}), app.post("/v1/referral/validate", [ limiter, authContext ], async (r, s) => {
  try {
    var {
      referralType: t,
      referralIdentifier: c
    } = r.body;
    if (!t || !c) return s.status(400).json({
      code: "400",
      success: !1,
      message: "referralType and referralIdentifier are required"
    });
    var a = `referral:${t}:` + c;
    let e = await memcache.get(a);
    (e = e ? new Referral(JSON.parse(e.value)) : await Referral.findOne({
      referralType: t,
      uniqueIdentifier: c
    })) ? (await Referral.updateOne({
      _id: e._id
    }, {
      $set: {
        isValid: !0
      }
    }), await memcache.set(a, JSON.stringify(e), {
      lifetime: 300
    }), s.status(200).json({
      code: "200",
      success: !0,
      message: "Referral found",
      referral: {
        account: e.account,
        isValid: !0
      }
    })) : s.status(404).json({
      code: "404",
      success: !1,
      message: "Referral not found"
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
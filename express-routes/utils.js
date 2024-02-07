const app = require("express").Router(), Sentry = require("@sentry/node"), _CacheService = require("../services/cache/CacheService")["Service"], _MarketplaceService = require("../services/MarketplaceService")["Service"], Account = require("../models/Account")["Account"], AccountInvite = require("../models/AccountInvite")["AccountInvite"], verifyTwitter = require("../helpers/verify-social")["verifyTwitter"], rateLimit = require("express-rate-limit"), getFarcasterUserByFid = require("../helpers/farcaster")["getFarcasterUserByFid"], Fids = require("../models/farcaster")["Fids"], heavyLimiter = rateLimit({
  windowMs: 5e3,
  max: 1e4,
  message: "Too many requests, please try again later.",
  handler: (e, r, s) => {
    r.status(429).send("Too many requests, please try again later.");
  }
}), filteredUser = (app.get("/eth-to-usd", async (e, r) => {
  e = e.query.eth;
  if (!e) return r.json({
    code: 200,
    success: !0,
    usd: 0
  });
  try {
    var s = await new _MarketplaceService().ethToUsd(e);
    return r.json({
      code: 200,
      success: !0,
      usd: s
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.json({
      code: 500,
      success: !1,
      message: e.message
    });
  }
}), app.get("/get-riddle", async (e, r) => {
  e = e.query.address;
  if (!e) return r.json({
    code: 500,
    success: !1,
    message: "Address is required"
  });
  try {
    var s = await Account.findOrCreateByAddressAndChainId({
      address: e,
      chainId: 1
    });
    const t = await AccountInvite.findOrCreate({
      accountId: s._id
    });
    return await new _CacheService().getOrCallbackAndSet(() => t.code, {
      key: "InviteCode",
      params: {
        address: e
      },
      expiresAt: null
    }), r.json({
      code: 200,
      success: !0,
      inviteCode: t.code
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.json({
      code: 500,
      success: !1,
      message: e.message
    });
  }
}), app.get("/verfy-riddle", async (r, s) => {
  var t = r.query.address;
  if (!t) return s.json({
    code: 500,
    success: !1,
    message: "Address is required"
  });
  try {
    var a = new _CacheService(), c = await a.get({
      key: "InviteCode",
      params: {
        address: t
      }
    });
    if (await a.get({
      key: "VerifiedInviteCode",
      params: {
        address: t
      }
    })) return s.json({
      code: 200,
      success: !0,
      verified: !0
    });
    var i = r.query.type || "twitter";
    let e = !1;
    return "twitter" === i ? e = await verifyTwitter(r.query.url, c) : "farcaster" === i && (e = !0), 
    e ? (await a.set({
      key: "VerifiedInviteCode",
      params: {
        address: t
      },
      value: !0,
      expiresAt: null
    }), s.json({
      code: 200,
      success: !0,
      verified: e
    })) : s.json({
      code: 200,
      success: !0,
      verified: !1
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), s.json({
      code: 500,
      success: !1,
      message: e.message
    });
  }
}), app.get("/need-invite", heavyLimiter, async (e, r) => {
  e = e.query.email;
  if (!e) return r.json({
    code: 500,
    success: !1,
    message: "Email is required"
  });
  try {
    return await new _CacheService().set({
      key: "NeedInvite",
      params: {
        email: e
      },
      value: e,
      expiresAt: null
    }), r.json({
      code: 200,
      success: !0
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.json({
      code: 500,
      success: !1,
      message: e.message
    });
  }
}), async e => {
  return !e || !(e = await getFarcasterUserByFid(e)).username || !e.displayName || e.external || e.followerCount < 1 ? null : e.username;
});

app.get("/recent-users", heavyLimiter, async (e, r) => {
  try {
    var s = await Fids.find({}).sort({
      createdAt: -1
    }).limit(750), t = (s.sort(() => Math.random() - .5), []);
    for (let e = 0; e < s.length; e++) {
      var a = await filteredUser(s[e].fid);
      if (a && t.push(a), 3 <= t.length) break;
    }
    return t.length < 3 ? (Sentry.captureMessage("Could not find at least 3 users!"), 
    r.json({
      code: 200,
      success: !0,
      users: []
    })) : r.json({
      code: 200,
      success: !0,
      users: t
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.json({
      code: 500,
      success: !1,
      message: e.message
    });
  }
}), module.exports = {
  router: app
};
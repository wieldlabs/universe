const app = require("express").Router(), Sentry = require("@sentry/node"), rateLimit = require("express-rate-limit"), _CacheService = require("../services/cache/CacheService")["Service"], AccountInvite = require("../models/AccountInvite")["AccountInvite"], validateAndConvertAddress = require("../helpers/validate-and-convert-address")["validateAndConvertAddress"], _FarcasterHubService = require("../services/identities/FarcasterHubService")["Service"], createReferral = require("../helpers/referral")["createReferral"], CacheService = new _CacheService(), REFERRAL_KEY = "ReferralService", REFERRAL_KEY_V2 = "ReferralServiceV2", limiter = rateLimit({
  windowMs: 3e3,
  max: 1e4,
  message: "Too many requests, please try again later."
});

app.get("/v2/:referralCode/verify", limiter, async (e, r) => {
  try {
    var s = e.params.referralCode;
    if (s) return await AccountInvite.findOne({
      code: s
    }) ? r.json({
      code: 200,
      success: !0
    }) : r.json({
      code: 500,
      success: !1,
      message: "Invalid referral code"
    });
    throw new Error("Missing required params");
  } catch (e) {
    return console.error(e), Sentry.captureException(e), r.json({
      code: 500,
      success: !1,
      message: e.message
    });
  }
}), app.post("/v2/:referralCode", limiter, async (e, r) => {
  try {
    var s = e.params.referralCode, a = e.body.address;
    if (s && a) return await CacheService.set({
      key: REFERRAL_KEY_V2,
      params: {
        address: validateAndConvertAddress(a)
      },
      value: "" + s
    }), r.json({
      code: 200,
      success: !0
    });
    throw new Error("Missing required params");
  } catch (e) {
    return console.error(e), Sentry.captureException(e), r.json({
      code: 500,
      success: !1,
      message: e.message
    });
  }
}), app.post("/:referralCode", limiter, async (e, r) => {
  try {
    var s = e.params.referralCode || "none", a = e.body.address, c = e.body.hash;
    return await createReferral({
      referralCode: s,
      address: a,
      hash: c
    }), r.json({
      code: 200,
      success: !0
    });
  } catch (e) {
    return console.error(e), Sentry.captureException(e), r.json({
      code: 500,
      success: !1,
      message: e.message
    });
  }
}), app.get("/get-user/:referralCode", limiter, async (e, r) => {
  try {
    var s, a, c = e.params.referralCode, t = await AccountInvite.findOne({
      code: c
    });
    return t ? (s = (await t.populate("account")).account) ? (a = await new _FarcasterHubService().getProfileByAccount(s), 
    r.json({
      code: 200,
      success: !0,
      profile: a
    })) : r.json({
      code: 200,
      success: !1
    }) : r.json({
      code: 200,
      success: !1
    });
  } catch (e) {
    return console.error(e), Sentry.captureException(e), r.json({
      code: 500,
      success: !1,
      message: e.message
    });
  }
}), module.exports = {
  router: app
};
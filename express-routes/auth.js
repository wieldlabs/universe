const app = require("express").Router(), Sentry = require("@sentry/node"), _AuthService = require("../services/AuthService")["Service"], {
  heavyLimiter,
  authContext,
  limiter
} = require("../helpers/express-middleware"), AccountInvite = require("../models/AccountInvite")["AccountInvite"];

app.post("/v1/auth-by-signature", heavyLimiter, async (e, s) => {
  e = e.body;
  try {
    var {
      account: t,
      accessToken: c
    } = await new _AuthService().authenticate(e);
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Successfully authenticated",
      account: t,
      accessToken: c
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/get-account-signin-message", heavyLimiter, async (e, s) => {
  var {
    address: e,
    chainId: t = 1,
    creationOrigin: c
  } = e.query;
  if (!e) return s.json({
    code: 500,
    success: !1,
    message: "Address is required"
  });
  try {
    var a = await new _AuthService().getMessageToSign({
      address: e,
      chainId: t,
      creationOrigin: c
    });
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      signature: a
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/get-current-account", [ limiter, authContext ], async (e, s) => {
  try {
    var t = e.context.account;
    if (!t) throw new Error("Account not found");
    var [ , c ] = await Promise.all([ await t.populate("addresses profileImage"), await AccountInvite.findOrCreate({
      accountId: t._id
    }) ]);
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      account: {
        ...t.toObject(),
        invite: c
      }
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
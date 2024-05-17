const app = require("express").Router(), Sentry = require("@sentry/node"), _AuthService = require("../services/AuthService")["Service"], _AccountRecovererService = require("../services/AccountRecovererService")["Service"], {
  heavyLimiter,
  authContext,
  limiter
} = require("../helpers/express-middleware"), AccountInvite = require("../models/AccountInvite")["AccountInvite"], {
  getFarcasterUserByFid,
  getFarcasterUserByCustodyAddress
} = require("../helpers/farcaster");

app.post("/v1/auth-by-signature", heavyLimiter, async (e, s) => {
  e = e.body;
  try {
    var {
      account: r,
      accessToken: t
    } = await new _AuthService().authenticateWithSigner(e);
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Successfully authenticated",
      account: r,
      accessToken: t
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
    chainId: r = 1,
    creationOrigin: t
  } = e.query;
  if (!e) return s.json({
    code: 500,
    success: !1,
    message: "Address is required"
  });
  try {
    var c = await new _AuthService().getMessageToSign({
      address: e,
      chainId: r,
      creationOrigin: t
    });
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      signature: c
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
    var r = e.context.account;
    if (!r) throw new Error("Account not found");
    await r.populate("addresses profileImage");
    var t = r.addresses[0].address?.toLowerCase(), [ c, a, o ] = await Promise.all([ AccountInvite.findOrCreate({
      accountId: r._id
    }), getFarcasterUserByCustodyAddress(t), getFarcasterUserByFid(t) ]), n = a || o;
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      account: {
        ...r.toObject(),
        invite: c,
        identities: {
          farcaster: n
        }
      }
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/add-recoverer", [ limiter, authContext ], async (e, s) => {
  var r = e.context.account;
  if (!r) throw new Error("Account not found");
  var {
    recovererAddress: e,
    type: t,
    id: c
  } = e.body;
  if (!e) throw new Error("RecovererAddress is required");
  await r.populate("addresses");
  try {
    var a = await new _AccountRecovererService().addRecoverer(r, {
      id: c || r.addresses[0].address,
      type: t || "FARCASTER_SIGNER_EXTERNAL",
      address: e
    });
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Recoverer added successfully",
      result: a
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
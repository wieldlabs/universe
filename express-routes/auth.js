const app = require("express").Router(), Sentry = require("@sentry/node"), _AuthService = require("../services/AuthService")["Service"], _AccountRecovererService = require("../services/AccountRecovererService")["Service"], {
  heavyLimiter,
  authContext,
  limiter
} = require("../helpers/express-middleware"), AccountInvite = require("../models/AccountInvite")["AccountInvite"], SignedKeyRequest = require("../models/SignedKeyRequest")["SignedKeyRequest"], {
  getFarcasterUserByFid,
  getFarcasterUserByCustodyAddress
} = require("../helpers/farcaster"), crypto = require("crypto"), memcache = require("../connectmemcache")["memcache"];

app.post("/v1/auth-by-signature", heavyLimiter, async (e, s) => {
  e = e.body;
  try {
    var {
      account: t,
      accessToken: r
    } = await new _AuthService().authenticateWithSigner(e);
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Successfully authenticated",
      account: t,
      accessToken: r
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
    creationOrigin: r
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
      creationOrigin: r
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
    var r = "true" === e.headers.external, a = (await t.populate("addresses profileImage"), 
    t.addresses[0].address?.toLowerCase()), [ c, n, i ] = await Promise.all([ AccountInvite.findOrCreate({
      accountId: t._id
    }), r ? null : getFarcasterUserByCustodyAddress(a), getFarcasterUserByFid(a) ]), o = n || i;
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      account: {
        ...t.toObject(),
        invite: c,
        identities: {
          farcaster: o
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
  var t = e.context.account;
  if (!t) throw new Error("Account not found");
  var {
    recovererAddress: e,
    type: r,
    id: a
  } = e.body;
  if (!e) throw new Error("RecovererAddress is required");
  await t.populate("addresses");
  try {
    var c = await new _AccountRecovererService().addRecoverer(t, {
      id: a || t.addresses[0].address,
      type: r || "FARCASTER_SIGNER_EXTERNAL",
      address: e
    });
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Recoverer added successfully",
      result: c
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/signed-key-request", [ limiter ], async (e, s) => {
  const {
    appFid: t,
    ...r
  } = e.body;
  if (!t) throw new Error("AppFid is required");
  try {
    var a = crypto.randomBytes(16).toString("hex"), c = (await new SignedKeyRequest({
      appFid: t,
      key: r.key,
      status: "pending",
      chainId: r.chainId,
      token: a
    }).save(), "farquest://signed-key-request?token=" + a);
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Signed key request created successfully",
      token: a,
      deepLink: c
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/sign-signed-key-request", [ heavyLimiter, authContext ], async (e, s) => {
  var t = e.context.account;
  if (!t) throw new Error("Account not found");
  const {
    token: r,
    ...a
  } = e.body;
  if (!r) throw new Error("Token is required");
  try {
    let e = await SignedKeyRequest.findOne({
      token: r
    });
    if (!e) throw new Error("Signed key request not found");
    await t.populate("addresses"), t.addresses && 0 < t.addresses.length && (e.address = t.addresses[0].address), 
    a.signature && (e.signature = a.signature), a.signerData && (e.signerData = {
      key: a.signerData.key,
      deadline: a.signerData.deadline,
      metadata: a.signerData.metadata,
      signature: a.signerData.signature
    }), e.status = "signed", e = await e.save(), await memcache.delete("SignedKeyRequest:" + e.token, {
      noreply: !0
    }), s.status(201).json({
      code: "201",
      success: !0,
      message: "Signed key request created successfully",
      signedKeyRequest: e
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/signed-key-request", [ limiter ], async (e, s) => {
  e = e.query.token;
  if (!e) throw new Error("Token is required");
  let t = null, r = null, a = null;
  var c = await memcache.get("SignedKeyRequest:" + e);
  if (c) t = JSON.parse(c.value).signedKeyRequest, r = JSON.parse(c.value).appData, 
  a = JSON.parse(c.value).noOfUsers; else {
    if (!(t = await SignedKeyRequest.findOne({
      token: e
    }))) throw new Error("Signed key request not found");
    a = await SignedKeyRequest.countDocuments({
      appFid: t.appFid,
      status: "signed"
    }), r = await getFarcasterUserByFid(t.appFid), await memcache.set("SignedKeyRequest:" + e, JSON.stringify({
      signedKeyRequest: t,
      appData: r,
      noOfUsers: a
    }), {
      lifetime: 86400
    });
  }
  s.status(200).json({
    code: "200",
    success: !0,
    message: "Signed key request fetched successfully",
    signedKeyRequest: {
      status: t.status,
      key: t.key,
      app: r,
      noOfUsers: a
    }
  });
}), app.post("/v1/auth-by-signed-key-request", heavyLimiter, async (e, s) => {
  e = e.body;
  try {
    var t = e["token"], r = await SignedKeyRequest.findOne({
      token: t
    });
    if (!r) throw new Error("Signed key request not found");
    if ("signed" !== r.status) return s.status(201).json({
      code: "201",
      success: !0,
      message: "Awaiting user signature",
      status: r.status
    });
    var {
      account: a,
      accessToken: c
    } = await new _AuthService().authenticateWithSigner({
      address: r.address,
      chainId: r.chainId,
      signature: r.signature,
      signerData: r.signerData
    });
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Successfully authenticated",
      account: a,
      accessToken: c
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
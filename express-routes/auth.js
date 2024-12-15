const app = require("express").Router(), Sentry = require("@sentry/node"), _AuthService = require("../services/AuthService")["Service"], _AccountRecovererService = require("../services/AccountRecovererService")["Service"], {
  heavyLimiter,
  authContext,
  limiter
} = require("../helpers/express-middleware"), farcasterAuthContext = require("./farcaster")["farcasterAuthContext"], AccountInvite = require("../models/AccountInvite")["AccountInvite"], SignedKeyRequest = require("../models/SignedKeyRequest")["SignedKeyRequest"], {
  getFarcasterUserByFid,
  getFarcasterUserByCustodyAddress
} = require("../helpers/farcaster"), crypto = require("crypto"), memcache = require("../connectmemcache")["memcache"];

app.post("/v1/auth-by-signature", heavyLimiter, async (e, s) => {
  e = e.body;
  try {
    var {
      account: t,
      accessToken: a
    } = await new _AuthService().authenticateWithSigner(e);
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Successfully authenticated",
      account: t,
      accessToken: a
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.post("/v1/authenticate", heavyLimiter, async (e, s) => {
  e = e.body;
  try {
    var {
      account: t,
      accessToken: a
    } = await new _AuthService().authenticate(e);
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Successfully authenticated",
      account: t,
      accessToken: a
    });
  } catch (e) {
    (!e?.message?.includes("Invalid token") || .99 < Math.random()) && Sentry.captureException(e), 
    console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/get-account-signin-message", heavyLimiter, async (e, s) => {
  var {
    address: e,
    chainId: t = 1,
    creationOrigin: a
  } = e.query;
  if (!e) return s.json({
    code: 500,
    success: !1,
    message: "Address is required"
  });
  try {
    var r = await new _AuthService().getMessageToSign({
      address: e,
      chainId: t,
      creationOrigin: a
    });
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      signature: r
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), s.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.get("/v1/get-current-account", [ limiter, farcasterAuthContext ], async (e, s) => {
  try {
    var t = e.context.account;
    if (!t) throw new Error("Account not found");
    await t.populate("addresses profileImage");
    var [ a, r ] = await Promise.all([ AccountInvite.findOrCreate({
      accountId: t._id
    }), getFarcasterUserByFid(e.context.fid) ]);
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      account: {
        ...t.toObject(),
        invite: a,
        identities: {
          farcaster: r
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
}), app.get("/v1/get-current-farcaster", [ limiter, authContext ], async (e, s) => {
  try {
    var t = e.context.account;
    if (!t) throw new Error("Account not found");
    var a = "true" === e.headers.external, r = (await t.populate("addresses"), t.addresses[0].address?.toLowerCase()), [ c, n ] = await Promise.all([ a ? null : getFarcasterUserByCustodyAddress(r), getFarcasterUserByFid(r) ]), i = c || n;
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      farcaster: i
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
    type: a,
    id: r
  } = e.body;
  if (!e) throw new Error("RecovererAddress is required");
  await t.populate("addresses");
  try {
    var c = await new _AccountRecovererService().addRecoverer(t, {
      id: r || t.addresses[0].address,
      type: a || "FARCASTER_SIGNER_EXTERNAL",
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
    ...a
  } = e.body;
  if (!t) throw new Error("AppFid is required");
  try {
    var r = crypto.randomBytes(16).toString("hex"), c = (await new SignedKeyRequest({
      appFid: t,
      key: a.key,
      status: "pending",
      chainId: a.chainId,
      token: r
    }).save(), "farquest://signed-key-request?token=" + r);
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Signed key request created successfully",
      token: r,
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
    token: a,
    ...r
  } = e.body;
  if (!a) throw new Error("Token is required");
  try {
    let e = await SignedKeyRequest.findOne({
      token: a
    });
    if (!e) throw new Error("Signed key request not found");
    await t.populate("addresses"), t.addresses && 0 < t.addresses.length && (e.address = t.addresses[0].address), 
    r.signature && (e.signature = r.signature), r.signerData && (e.signerData = {
      key: r.signerData.key,
      deadline: r.signerData.deadline,
      metadata: r.signerData.metadata,
      signature: r.signerData.signature
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
  let t = null, a = null, r = null;
  var c = await memcache.get("SignedKeyRequest:" + e);
  if (c) t = JSON.parse(c.value).signedKeyRequest, a = JSON.parse(c.value).appData, 
  r = JSON.parse(c.value).noOfUsers; else {
    if (!(t = await SignedKeyRequest.findOne({
      token: e
    }))) throw new Error("Signed key request not found");
    r = await SignedKeyRequest.countDocuments({
      appFid: t.appFid,
      status: "signed"
    }), a = await getFarcasterUserByFid(t.appFid), await memcache.set("SignedKeyRequest:" + e, JSON.stringify({
      signedKeyRequest: t,
      appData: a,
      noOfUsers: r
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
      app: a,
      noOfUsers: r
    }
  });
}), app.post("/v1/auth-by-signed-key-request", heavyLimiter, async (e, s) => {
  e = e.body;
  try {
    var t = e["token"], a = await SignedKeyRequest.findOne({
      token: t
    });
    if (!a) throw new Error("Signed key request not found");
    if ("signed" !== a.status) return s.status(201).json({
      code: "201",
      success: !0,
      message: "Awaiting user signature",
      status: a.status
    });
    var r = new _AuthService(), c = {
      address: a.address,
      chainId: a.chainId,
      signature: a.signature,
      revokeId: a._id
    }, {
      account: n,
      accessToken: i
    } = (a.signerData && a.signerData.key && (c.signerData = {
      recovererAddress: a.signerData.key,
      deadline: a.signerData.deadline,
      metadata: a.signerData.metadata,
      signature: a.signerData.signature
    }), await r.authenticateWithSigner(c));
    s.status(201).json({
      code: "201",
      success: !0,
      message: "Successfully authenticated",
      account: n,
      accessToken: i
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
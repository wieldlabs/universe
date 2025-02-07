const express = require("express"), app = express.Router(), Sentry = require("@sentry/node"), AbiParameters = require("ox")["AbiParameters"], parseWebhookEvent = require("@farcaster/frame-node")["parseWebhookEvent"], {
  setUserNotificationDetails,
  deleteUserNotificationDetails,
  sendFrameNotification
} = require("../helpers/farcaster"), FARAGENT_WEBHOOK_ID = "FARAGENT", FARHERO_WEBHOOK_ID = "FARHERO", signedKeyRequestAbi = [ {
  components: [ {
    name: "requestFid",
    type: "uint256"
  }, {
    name: "requestSigner",
    type: "address"
  }, {
    name: "signature",
    type: "bytes"
  }, {
    name: "deadline",
    type: "uint256"
  } ],
  name: "SignedKeyRequest",
  type: "tuple"
} ], verifyAppKey = async (r, t) => {
  try {
    let e = (process.env.HUB_ADDRESS || "https://nemes.farcaster.xyz:2281").replace(":2283", ":2281");
    e.startsWith("http") || (e = "http://" + e);
    var a = new URL("/v1/onChainSignersByFid", e), i = (a.searchParams.append("fid", r.toString()), 
    await fetch(a));
    if (200 !== i.status) throw new Error("Non-200 response received: " + await i.text());
    var o = await i.json();
    const d = t.toLowerCase();
    if (!o.events) throw new Error("No events found in response: " + JSON.stringify(o));
    var s = o.events.find(e => e.signerEventBody.key.toLowerCase() === d);
    if (!s) return {
      valid: !1
    };
    var n = AbiParameters.decode(signedKeyRequestAbi, Buffer.from(s.signerEventBody.metadata, "base64"));
    if (1 !== n.length) throw new Error("Error decoding metadata");
    return {
      valid: !0,
      appFid: Number(n[0].requestFid)
    };
  } catch (e) {
    return console.error("Error verifying app key:", e), Sentry.captureException(e, {
      extra: {
        fid: r,
        appKey: t
      }
    }), {
      valid: !1
    };
  }
};

app.post("/faragent", async (r, t) => {
  try {
    var e = await parseWebhookEvent(r.body, verifyAppKey), a = e.fid, i = e.event, o = e.appFid;
    if (!a || !o) throw new Error("No FID or appFid found in request");
    if (!i) throw new Error("No event found in request");
    switch (i.event) {
     case "frame_added":
      i.notificationDetails && (await setUserNotificationDetails({
        fid: a,
        appFid: o,
        webhookId: FARAGENT_WEBHOOK_ID,
        notificationDetails: i.notificationDetails
      }), await sendFrameNotification({
        fid: a,
        appFid: o,
        webhookId: FARAGENT_WEBHOOK_ID,
        title: "Welcome to FarAgent!",
        body: "FarAgent is ready to go on your account!",
        targetUrl: "https://far.quest/agents"
      }));
      break;

     case "frame_removed":
      await deleteUserNotificationDetails({
        fid: a,
        appFid: o,
        webhookId: FARAGENT_WEBHOOK_ID
      });
      break;

     case "notifications_enabled":
      await setUserNotificationDetails({
        fid: a,
        appFid: o,
        webhookId: FARAGENT_WEBHOOK_ID,
        notificationDetails: i.notificationDetails
      }), await sendFrameNotification({
        fid: a,
        appFid: o,
        webhookId: FARAGENT_WEBHOOK_ID,
        title: "FarAgent Notifications Enabled!",
        targetUrl: "https://far.quest/agents"
      });
      break;

     case "notifications_disabled":
      await deleteUserNotificationDetails({
        fid: a,
        appFid: o,
        webhookId: FARAGENT_WEBHOOK_ID
      });
    }
    return t.status(200).json({
      success: !0
    });
  } catch (e) {
    return console.error("Frame webhook error:", e), Sentry.captureException(e, {
      extra: {
        request: r.body
      }
    }), "VerifyJsonFarcasterSignature.InvalidDataError" === e.name || "VerifyJsonFarcasterSignature.InvalidEventDataError" === e.name ? t.status(400).json({
      success: !1,
      error: e.message
    }) : "VerifyJsonFarcasterSignature.InvalidAppKeyError" === e.name ? t.status(401).json({
      success: !1,
      error: e.message
    }) : "VerifyJsonFarcasterSignature.VerifyAppKeyError" === e.name ? t.status(500).json({
      success: !1,
      error: e.message
    }) : t.status(500).json({
      error: "Internal server error"
    });
  }
}), app.post("/farhero", async (r, t) => {
  try {
    var e = await parseWebhookEvent(r.body, verifyAppKey), a = e.fid, i = e.event, o = e.appFid;
    if (!a || !o) throw new Error("No FID or appFid found in request");
    if (!i) throw new Error("No event found in request");
    switch (i.event) {
     case "frame_added":
      i.notificationDetails && (await setUserNotificationDetails({
        fid: a,
        appFid: o,
        webhookId: FARHERO_WEBHOOK_ID,
        notificationDetails: i.notificationDetails
      }), await sendFrameNotification({
        fid: a,
        appFid: o,
        webhookId: FARHERO_WEBHOOK_ID,
        title: "Welcome to FarHero!",
        body: "FarHero is ready to go on your account!",
        targetUrl: "https://hero.far.quest/~/farhero"
      }));
      break;

     case "frame_removed":
      await deleteUserNotificationDetails({
        fid: a,
        appFid: o,
        webhookId: FARHERO_WEBHOOK_ID
      });
      break;

     case "notifications_enabled":
      await setUserNotificationDetails({
        fid: a,
        appFid: o,
        webhookId: FARHERO_WEBHOOK_ID,
        notificationDetails: i.notificationDetails
      }), await sendFrameNotification({
        fid: a,
        appFid: o,
        webhookId: FARHERO_WEBHOOK_ID,
        title: "FarHero Notifications Enabled!",
        targetUrl: "https://hero.far.quest/~/farhero"
      });
      break;

     case "notifications_disabled":
      await deleteUserNotificationDetails({
        fid: a,
        appFid: o,
        webhookId: FARHERO_WEBHOOK_ID
      });
    }
    return t.status(200).json({
      success: !0
    });
  } catch (e) {
    return console.error("Frame webhook error:", e), Sentry.captureException(e, {
      extra: {
        request: r.body
      }
    }), "VerifyJsonFarcasterSignature.InvalidDataError" === e.name || "VerifyJsonFarcasterSignature.InvalidEventDataError" === e.name ? t.status(400).json({
      success: !1,
      error: e.message
    }) : "VerifyJsonFarcasterSignature.InvalidAppKeyError" === e.name ? t.status(401).json({
      success: !1,
      error: e.message
    }) : "VerifyJsonFarcasterSignature.VerifyAppKeyError" === e.name ? t.status(500).json({
      success: !1,
      error: e.message
    }) : t.status(500).json({
      error: "Internal server error"
    });
  }
}), module.exports = {
  router: app
};
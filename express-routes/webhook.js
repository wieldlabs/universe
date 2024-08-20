const express = require("express"), app = express.Router(), Sentry = require("@sentry/node"), {
  memcache,
  getHash
} = require("../connectmemcache"), {
  DEFAULT_NETWORKS,
  DEFAULT_LIMIT,
  DEFAULT_CURSORS,
  DEFAULT_FILTER_NO_SYMBOL
} = require("../helpers/wallet"), CastHandle = require("../models/CastHandle")["CastHandle"], Metadata = require("../models/Metadata")["Metadata"], prod = require("../helpers/registrar")["prod"], crypto = require("crypto");

function isValidSignatureForStringBody(e, r, t) {
  t = crypto.createHmac("sha256", t), t.update(e, "utf8"), e = t.digest("hex");
  return r === e;
}

app.post("/nft-activity", express.raw({
  type: "application/json"
}), async (r, t) => {
  try {
    var e = r.body.toString("utf8");
    if ("production" === process.env.NODE_ENV) {
      if (!process.env.ALCHEMY_WEBHOOK_SECRET_ETH_CAST || !process.env.ALCHEMY_WEBHOOK_SECRET_OP_CAST) throw new Error("Missing Alchemy webhook secrets! https://dashboard.alchemy.com/webhooks");
      if (!isValidSignatureForStringBody(e, r.headers["x-alchemy-signature"], process.env.ALCHEMY_WEBHOOK_SECRET_ETH_CAST) && !isValidSignatureForStringBody(e, r.headers["x-alchemy-signature"], process.env.ALCHEMY_WEBHOOK_SECRET_OP_CAST)) throw new Error(`Invalid signature for webhook! req.headers["x-alchemy-signature"]: ${r.headers["x-alchemy-signature"]} - req.body: ` + e);
    }
    var o = JSON.parse(e);
    if (!o.event?.activity) throw new Error("No activity found in req.body.event webhook!");
    for (const h of o.event.activity) {
      var {
        contractAddress: a,
        erc721TokenId: s
      } = h, n = s?.toLowerCase(), i = h.toAddress?.toLowerCase();
      if (!n || !n.startsWith("0x")) throw new Error(`Invalid tokenId! Must start with 0x: ${n} for contractAddress: ` + a);
      if (!i || !i.startsWith("0x")) throw new Error(`Invalid owner! Must start with 0x: ${i} for tokenId: ` + n);
      if (![ prod().REGISTRAR_ADDRESS.toLowerCase(), prod().OPTIMISM_REGISTRAR_ADDRESS.toLowerCase() ].includes(a.toLowerCase())) throw new Error("No valid registrar contract found for contractAddress: " + a);
      var d = await Metadata.findOne({
        uri: n
      }), c = a.toLowerCase() === prod().OPTIMISM_REGISTRAR_ADDRESS.toLowerCase(), E = d?.domain || n;
      await CastHandle.findOneAndUpdate({
        handle: E
      }, {
        owner: i,
        chain: c ? "OP" : "ETH",
        tokenId: n
      }, {
        upsert: !0,
        new: !0
      }), console.log(`NFT Activity Webhook - Updated cast handle: ${E} to owner: ${i} on ` + (c ? "OP" : "ETH"));
    }
    return t.status(200).send("NFT activity webhook received");
  } catch (e) {
    console.error("Error handling webhook:", e), Sentry.captureException(e, {
      extra: {
        rawBody: r.body?.toString("utf8")
      }
    }), t.status(500).send("Internal Server Error");
  }
}), module.exports = {
  router: app
};
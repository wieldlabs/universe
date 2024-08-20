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
}), async (e, r) => {
  try {
    var t = e.body.toString("utf8");
    if ("production" === process.env.NODE_ENV) {
      if (!process.env.ALCHEMY_WEBHOOK_SECRET_ETH_CAST || !process.env.ALCHEMY_WEBHOOK_SECRET_OP_CAST) throw new Error("Missing Alchemy webhook secrets! https://dashboard.alchemy.com/webhooks");
      if (!isValidSignatureForStringBody(t, e.headers["x-alchemy-signature"], process.env.ALCHEMY_WEBHOOK_SECRET_ETH_CAST) && !isValidSignatureForStringBody(t, e.headers["x-alchemy-signature"], process.env.ALCHEMY_WEBHOOK_SECRET_OP_CAST)) return console.log("Invalid signature for webhook!"), 
      r.status(400).send("Invalid signature for webhook!");
    }
    var o = JSON.parse(t);
    if (!o.event?.activity) return console.log("No activity found in webhook!"), 
    r.status(200).send("NFT activity webhook received");
    for (const p of o.event.activity) {
      var a, n, {
        contractAddress: s,
        erc721TokenId: i
      } = p, d = i, c = p.toAddress.toLowerCase();
      [ prod().REGISTRAR_ADDRESS, prod().OPTIMISM_REGISTRAR_ADDRESS ].includes(s) ? (a = await Metadata.findOne({
        uri: d
      }), n = s === prod().OPTIMISM_REGISTRAR_ADDRESS, await CastHandle.findOneAndUpdate({
        handle: a?.domain || d
      }, {
        owner: c,
        chain: n ? "OP" : "ETH",
        tokenId: d
      }, {
        upsert: !0,
        new: !0
      }), console.log(`NFT Activity Webhook - Updated cast handle: ${a?.domain || d} to owner: ${c} on ` + (n ? "OP" : "ETH"))) : console.log("Skipping non-registrar contract:", s);
    }
    r.status(200).send("NFT activity webhook received");
  } catch (e) {
    console.error("Error handling webhook:", e), Sentry.captureException(e), r.status(500).send("Internal Server Error");
  }
}), module.exports = {
  router: app
};
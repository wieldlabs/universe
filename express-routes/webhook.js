const express = require("express"), app = express.Router(), Sentry = require("@sentry/node"), {
  memcache,
  getHash
} = require("../connectmemcache"), {
  DEFAULT_NETWORKS,
  DEFAULT_LIMIT,
  DEFAULT_CURSORS,
  DEFAULT_FILTER_NO_SYMBOL
} = require("../helpers/wallet"), CastHandle = require("../models/CastHandle")["CastHandle"], Metadata = require("../models/Metadata")["Metadata"], {
  prod,
  config
} = require("../helpers/registrar"), crypto = require("crypto"), Pack = require("../models/farcaster/tcg")["Pack"], _RegistrarService = require("../services/RegistrarService")["Service"];

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
    var a = JSON.parse(e);
    if (!a.event?.activity) throw new Error("No activity found in req.body.event webhook!");
    var o = new _RegistrarService("optimism"), n = new _RegistrarService();
    for (const y of a.event.activity) {
      var {
        contractAddress: s,
        erc721TokenId: i
      } = y, c = i?.toLowerCase(), d = y.toAddress?.toLowerCase();
      if (!c || !c.startsWith("0x")) throw new Error(`Invalid tokenId! Must start with 0x: ${c} for contractAddress: ` + s);
      if (!d || !d.startsWith("0x")) throw new Error(`Invalid owner! Must start with 0x: ${d} for tokenId: ` + c);
      if (![ prod().REGISTRAR_ADDRESS.toLowerCase(), prod().OPTIMISM_REGISTRAR_ADDRESS.toLowerCase() ].includes(s.toLowerCase())) throw new Error("No valid registrar contract found for contractAddress: " + s);
      var l = await Metadata.findOne({
        uri: c
      }), p = s.toLowerCase() === prod().OPTIMISM_REGISTRAR_ADDRESS.toLowerCase(), h = l?.domain || c, E = await CastHandle.findOne({
        handle: h
      }), w = p ? o : n;
      let e = null;
      try {
        E?.expiresAt || (e = await w.expiresAt(h, {
          tokenId: c
        }));
      } catch (e) {
        console.error(`Error getting expiresAt for handle: ${h} on ` + (p ? "OP" : "ETH"), e), 
        Sentry.captureException(e);
      }
      var S = await CastHandle.findOneAndUpdate({
        handle: h
      }, {
        owner: d.toLowerCase(),
        chain: p ? "OP" : "ETH",
        tokenId: c.toLowerCase(),
        ...e ? {
          expiresAt: e
        } : {}
      }, {
        upsert: !0,
        new: !0
      });
      if (config().SHOULD_CREATE_PACKS) {
        try {
          await Promise.all([ memcache.delete("tcg:inventory:first-page:" + S.owner, {
            noreply: !0
          }), memcache.delete("tcg:packs:first-page:" + S.owner, {
            noreply: !0
          }) ]);
        } catch (e) {
          console.error(e);
        }
        var u = await Pack.findOne({
          handle: S._id
        });
        let e;
        e = p ? "Premium" : h.length <= 9 ? "Collector" : "Normal", u ? (u.handle = S._id, 
        u.type = e, await u.save()) : await Pack.create({
          set: config().PACK_SET,
          type: e,
          handle: S._id
        });
      }
      console.log(`NFT Activity Webhook - Updated cast handle: ${h} to owner: ${d} on ` + (p ? "OP" : "ETH"));
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
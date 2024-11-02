const express = require("express"), app = express.Router(), Sentry = require("@sentry/node"), {
  memcache,
  getHash
} = require("../connectmemcache"), {
  DEFAULT_NETWORKS,
  DEFAULT_LIMIT,
  DEFAULT_CURSORS,
  DEFAULT_FILTER_NO_SYMBOL
} = require("../helpers/wallet"), CastHandle = require("../models/CastHandle")["CastHandle"], Account = require("../models/Account")["Account"], Metadata = require("../models/Metadata")["Metadata"], {
  prod,
  config
} = require("../helpers/registrar"), crypto = require("crypto"), {
  Pack,
  Player
} = require("../models/farcaster/tcg"), _RegistrarService = require("../services/RegistrarService")["Service"];

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
    for (const A of a.event.activity) {
      var {
        contractAddress: i,
        erc721TokenId: s
      } = A, c = s?.toLowerCase(), d = A.toAddress?.toLowerCase();
      if (!c || !c.startsWith("0x")) throw new Error(`Invalid tokenId! Must start with 0x: ${c} for contractAddress: ` + i);
      if (!d || !d.startsWith("0x")) throw new Error(`Invalid owner! Must start with 0x: ${d} for tokenId: ` + c);
      if (![ prod().REGISTRAR_ADDRESS.toLowerCase(), prod().OPTIMISM_REGISTRAR_ADDRESS.toLowerCase() ].includes(i.toLowerCase())) throw new Error("No valid registrar contract found for contractAddress: " + i);
      var l = await Metadata.findOne({
        uri: c
      }), h = i.toLowerCase() === prod().OPTIMISM_REGISTRAR_ADDRESS.toLowerCase(), p = l?.domain || c, w = await CastHandle.findOne({
        handle: p
      }), E = h ? o : n;
      let e = null;
      try {
        w?.expiresAt || (e = await E.expiresAt(p, {
          tokenId: c
        }));
      } catch (e) {
        console.error(`Error getting expiresAt for handle: ${p} on ` + (h ? "OP" : "ETH"), e), 
        Sentry.captureException(e);
      }
      var u = await CastHandle.findOneAndUpdate({
        handle: p
      }, {
        owner: d.toLowerCase(),
        chain: h ? "OP" : "ETH",
        tokenId: c.toLowerCase(),
        ...e ? {
          expiresAt: e
        } : {}
      }, {
        upsert: !0,
        new: !0
      });
      if (config().SHOULD_CREATE_PACKS && l?.domain) {
        try {
          await Promise.all([ memcache.delete("tcg:inventory:first-page:" + u.owner, {
            noreply: !0
          }), memcache.delete("tcg:packs:first-page:" + u.owner, {
            noreply: !0
          }) ]);
        } catch (e) {
          console.error(e);
        }
        var S, y = await Pack.findOne({
          handle: u._id
        });
        let e;
        e = h ? "Premium" : p.length <= 9 ? "Collector" : "Normal", y ? (y.handle = u._id, 
        y.type = e, await y.save()) : (await Pack.create({
          set: config().PACK_SET,
          type: e,
          handle: u._id
        }), (S = await Account.findByAddressAndChainId({
          address: d,
          chainId: 1
        })) && await Player.findOne({
          account: S._id
        }) && await u.setCastHandleMetadataForFarheroPacks(e));
      }
      console.log(`NFT Activity Webhook - Updated cast handle: ${p} to owner: ${d} on ` + (h ? "OP" : "ETH"));
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
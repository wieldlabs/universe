const app = require("express").Router(), Sentry = require("@sentry/node"), {
  memcache,
  getHash
} = require("../connectmemcache"), {
  DEFAULT_NETWORKS,
  DEFAULT_LIMIT,
  DEFAULT_CURSORS,
  DEFAULT_FILTER_NO_SYMBOL
} = require("../helpers/wallet");

app.post("/address-activity", async (e, r) => {
  try {
    var t, a = e.body, s = (console.log("Webhook received:", a), a?.event?.activity?.map(e => [ e.fromAddress.toLowerCase(), e.toAddress.toLowerCase() ])?.flat());
    if (!s) return t = new Error("No addresses found"), Sentry.captureException(t), 
    r.status(400).send("No addresses found");
    var o = [ ...new Set(s) ];
    await Promise.all(o.map(r => DEFAULT_NETWORKS.map(e => [ memcache.delete(getHash(`Wallet_getOnchainTransactions:${DEFAULT_LIMIT}:${e}:${DEFAULT_CURSORS[0]}:` + r)), memcache.delete(getHash(`Wallet_getOnchainNFTs:${DEFAULT_LIMIT}:${e}:${DEFAULT_CURSORS[0]}:` + r)), memcache.delete(getHash(`Wallet_getOnchainTokens:${DEFAULT_LIMIT}:${e}:${DEFAULT_CURSORS[0]}:${r}:` + DEFAULT_FILTER_NO_SYMBOL)) ])).flat()), 
    r.status(200).send("Webhook received and processed");
  } catch (e) {
    console.error("Error handling webhook:", e), Sentry.captureException(e), r.status(500).send("Internal Server Error");
  }
}), module.exports = {
  router: app
};
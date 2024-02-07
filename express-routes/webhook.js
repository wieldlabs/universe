const app = require("express").Router(), Sentry = require("@sentry/node"), {
  getMemcachedClient,
  getHash
} = require("../connectmemcached"), {
  DEFAULT_NETWORKS,
  DEFAULT_LIMIT,
  DEFAULT_CURSORS,
  DEFAULT_FILTER_NO_SYMBOL
} = require("../helpers/wallet");

app.post("/address-activity", async (e, t) => {
  try {
    var r, a = e.body, s = (console.log("Webhook received:", a), a?.event?.activity?.map(e => [ e.fromAddress.toLowerCase(), e.toAddress.toLowerCase() ])?.flat());
    if (!s) return r = new Error("No addresses found"), Sentry.captureException(r), 
    t.status(400).send("No addresses found");
    var o = [ ...new Set(s) ];
    const n = getMemcachedClient();
    try {
      await Promise.all(o.map(t => DEFAULT_NETWORKS.map(e => [ n.delete(getHash(`Wallet_getOnchainTransactions:${DEFAULT_LIMIT}:${e}:${DEFAULT_CURSORS[0]}:` + t)), n.delete(getHash(`Wallet_getOnchainNFTs:${DEFAULT_LIMIT}:${e}:${DEFAULT_CURSORS[0]}:` + t)), n.delete(getHash(`Wallet_getOnchainTokens:${DEFAULT_LIMIT}:${e}:${DEFAULT_CURSORS[0]}:${t}:` + DEFAULT_FILTER_NO_SYMBOL)) ])).flat());
    } catch (e) {
      console.error(e);
    }
    t.status(200).send("Webhook received and processed");
  } catch (e) {
    console.error("Error handling webhook:", e), Sentry.captureException(e), t.status(500).send("Internal Server Error");
  }
}), module.exports = {
  router: app
};
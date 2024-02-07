const app = require("express").Router(), Sentry = require("@sentry/node"), Service = require("../services/AlchemyService")["Service"], AlchemyService = new Service({
  apiKey: process.env.HOMESTEAD_NODE_URL
}), ENS_CONTRACT_ADDRESS = "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85";

app.get("/owner/:filter?", async (s, t) => {
  try {
    if (!s.query.address) return {
      success: !1
    };
    let e = [], r = null;
    do {
      var a = await AlchemyService.getNFTs({
        owner: s.query.address,
        contractAddresses: [ ENS_CONTRACT_ADDRESS ],
        pageKey: r
      }), i = (a.ownedNfts || []).map(e => e.title);
      r = a.pageKey, e = e.concat(i);
    } while (r);
    if (s.params.filter) if ("10K" === s.params.filter) e = e.filter(e => /^[0-9]{1,4}\.eth/.test(e)); else if ("100K" === s.params.filter) e = e.filter(e => /^[0-9]{1,5}\.eth/.test(e)); else if ("999" === s.params.filter) e = e.filter(e => /^[0-9]{1,3}\.eth/.test(e)); else {
      if ("3L" !== s.params.filter) throw new Error("Invalid filter");
      e = e.filter(e => /^[A-Za-z]{1,3}\.eth/.test(e));
    }
    return t.json({
      code: 200,
      success: 0 < e?.length,
      ens: e
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.json({
      code: 500,
      success: !1,
      message: e.message,
      ens: []
    });
  }
}), module.exports = {
  router: app
};
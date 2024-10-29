const Sentry = require("@sentry/node"), AlchemyService = require("../services/AlchemyService")["Service"], config = require("./config")["config"];

async function getAddressTransactionCount(e, n) {
  var t = new AlchemyService({
    apiKey: config().ETH_NODE_URL,
    chain: "eth-mainnet"
  }), r = new AlchemyService({
    apiKey: config().OPTIMISM_NODE_URL,
    chain: "opt-mainnet"
  }), c = new AlchemyService({
    apiKey: config().BASE_NODE_URL,
    chain: "base-mainnet"
  });
  try {
    var [ i, o, a ] = await Promise.all([ t.getTransactionCount(e, n), r.getTransactionCount(e, n), c.getTransactionCount(e, n) ]);
    return {
      ethereum: i,
      optimism: o,
      base: a,
      total: i + o + a
    };
  } catch (e) {
    throw Sentry.captureException(e), console.error("Failed to fetch transaction counts:", e), 
    new Error("Failed to fetch transaction counts");
  }
}

module.exports = {
  getAddressTransactionCount: getAddressTransactionCount
};
const Sentry = require("@sentry/node"), {
  oneEthToUsd,
  formatWeiToUsd,
  weiToUsd,
  formatEth
} = require("./wallet"), AlchemyService = require("../services/AlchemyService")["Service"], config = require("./config")["config"];

async function getAddressBalance(e) {
  var t = new AlchemyService({
    apiKey: config().ETH_NODE_URL,
    chain: "eth-mainnet"
  }), a = new AlchemyService({
    apiKey: config().OPTIMISM_NODE_URL,
    chain: "opt-mainnet"
  }), o = new AlchemyService({
    apiKey: config().BASE_NODE_URL,
    chain: "base-mainnet"
  });
  try {
    var [ r, i, n, s ] = await Promise.all([ t.getBalance(e, "latest"), a.getBalance(e, "latest"), o.getBalance(e, "latest"), oneEthToUsd() ]);
    return {
      ethereum: {
        wei: r,
        symbol: "ETH",
        usd: formatWeiToUsd(r, s),
        eth: formatEth(r),
        usdRaw: weiToUsd(r, s)
      },
      optimism: {
        wei: i,
        symbol: "ETH",
        usd: formatWeiToUsd(i, s),
        eth: formatEth(i),
        usdRaw: weiToUsd(i, s)
      },
      base: {
        wei: n,
        symbol: "ETH",
        usd: formatWeiToUsd(n, s),
        eth: formatEth(n),
        usdRaw: weiToUsd(n, s)
      }
    };
  } catch (e) {
    throw Sentry.captureException(e), console.error(e), new Error("Failed to fetch token balances");
  }
}

module.exports = {
  getAddressBalance: getAddressBalance
};
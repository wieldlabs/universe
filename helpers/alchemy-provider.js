const ethers = require("ethers")["ethers"], getProvider = ({
  network: e,
  node: r
}) => {
  return "base-mainnet" === e || "base" === e ? new ethers.providers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/" + r, {
    name: "base",
    chainId: 8453
  }) : (e = "opt-mainnet" === e ? "optimism" : e, r ? new ethers.providers.AlchemyProvider(e || "homestead", r) : ethers.getDefaultProvider(e || "homestead"));
};

module.exports = {
  getProvider: getProvider
};
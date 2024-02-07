const ethers = require("ethers")["ethers"], getProvider = ({
  network: e,
  node: r
}) => {
  e = "opt-mainnet" === e ? "optimism" : e;
  return r ? new ethers.providers.AlchemyProvider(e || "homestead", r) : ethers.getDefaultProvider(e || "homestead");
};

module.exports = {
  getProvider: getProvider
};
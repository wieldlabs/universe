const ethers = require("ethers")["ethers"];

async function isDeployedContract(e, {
  network: r,
  apiKey: t
}) {
  return "0x" !== await new ethers.providers.AlchemyProvider(r, t).getCode(e);
}

module.exports = {
  isDeployedContract: isDeployedContract
};
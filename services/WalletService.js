const constants = require("./constants/aa"), ethers = require("ethers");

class WalletService {
  constructor({
    apiKey: e,
    chain: t = "opt-goerli",
    chainId: r = 420
  }) {
    this.apiKey = e, this.chain = t, this.chainId = r, "homestead" === this.chain && (this.chain = "mainnet");
  }
  async getBackpackNonce(e) {
    var t = constants.AccountContractJson.abi, r = new ethers.providers.AlchemyProvider(this.chainId, this.apiKey);
    return await new ethers.Contract(e, t, r).getNonce();
  }
  getInitCode({
    ownerAddress: e,
    factoryContractAddress: t = constants.factoryContractAddress,
    salt: r = 1
  }) {
    var n;
    if (e) return n = new ethers.utils.Interface(constants.FactoryContractJson.abi), 
    t = ethers.utils.hexZeroPad(t, 20), n = n.encodeFunctionData("createAccount", [ e, r ]), 
    ethers.utils.hexConcat([ t, n ]);
    throw new Error("ownerAddress is required");
  }
  getCallData({
    abi: e,
    functionName: t,
    value: r = 0,
    contractAddress: n,
    params: a = []
  }) {
    if (!e) throw new Error("abi is required");
    if (n) return e = new ethers.utils.Interface(e).encodeFunctionData(t, [ ...a ]), 
    t = constants.AccountContractJson.abi, new ethers.utils.Interface(t).encodeFunctionData("execute", [ n, r, e ]);
    throw new Error("contractAddress is required");
  }
}

module.exports = {
  Service: WalletService
};
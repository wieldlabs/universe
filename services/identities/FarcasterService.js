const ethers = require("ethers")["ethers"], axios = require("axios").default, Farcaster = require("../../models/Identities/Farcaster")["Farcaster"], getProvider = require("../../helpers/alchemy-provider")["getProvider"], farcasterRegistryAbi = require("../../helpers/abi/farcaster_registry_rinkeby_abi.js")["abi"], AlchemyProvider = getProvider({
  network: "rinkeby",
  node: ""
});

class FarcasterService {
  constructor({
    registryAddress: r
  } = {}) {
    this.registryContract = new ethers.Contract(r || "0xe3Be01D99bAa8dB9905b33a3cA391238234B79D1", farcasterRegistryAbi, AlchemyProvider);
  }
  async _getTotalUsernames() {
    return await this.registryContract.usernamesLength();
  }
  async _getUsernameByIndex(r) {
    return await this.registryContract.usernameAtIndex(r);
  }
  async _decodeByte32Username(r) {
    return ethers.utils.parseBytes32String("" + r);
  }
  async _getDirectoryUrl(r) {
    return await this.registryContract.getDirectoryUrl(r);
  }
  async _getDirectoryJson(r) {
    r = (await axios.get(r, {
      timeout: 2500
    })).data;
    return r;
  }
  async _getProofJson(r) {
    r = (await axios.get(r, {
      timeout: 2500
    })).data;
    return r;
  }
  async _updateOrCreateForAccount(r, {
    directoryUrl: e,
    avatarUrl: t,
    username: a,
    displayName: s,
    farcasterAddress: i
  }) {
    var c = await Farcaster.findById(r?.identities?.farcaster);
    return c ? (c.directoryUrl = e, c.avatarUrl = t, c.username = a, c.displayName = s, 
    c.farcasterAddress = i, await c.save(), c) : Farcaster.create({
      account: r,
      directoryUrl: e,
      avatarUrl: t,
      username: a,
      displayName: s,
      farcasterAddress: i
    });
  }
}

module.exports = {
  Service: FarcasterService
};
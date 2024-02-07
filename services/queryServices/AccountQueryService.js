const mongoose = require("mongoose"), AccountService = require("../AccountService")["Service"], FarcasterHubService = require("../identities/FarcasterHubService")["Service"], AccountCommunity = require("../../models/AccountCommunity")["AccountCommunity"], AccountNonce = require("../../models/AccountNonce")["AccountNonce"], AccountCommunityRole = require("../../models/AccountCommunityRole")["AccountCommunityRole"], _CacheService = require("../cache/CacheService")["Service"], walletConfig = require("../../helpers/constants/wallet")["config"], ethers = require("ethers")["ethers"], resolveEnsDataFromAddress = require("../../helpers/resolve-ens-data-from-address")["resolveEnsDataFromAddress"], isDeployedContract = require("../../helpers/is-deployed-contract")["isDeployedContract"];

class AccountQueryService extends AccountService {
  async hasPremiumRole(e) {
    return !!e?._id && !!(process.env.BEBVERSE_HOLDER_COMMUNITY_ID && process.env.BEBVERSE_HOLDER_ROLE_ID && (e = await AccountCommunity.findOne({
      account: e._id,
      community: mongoose.Types.ObjectId(process.env.BEBVERSE_HOLDER_COMMUNITY_ID)
    })) && await AccountCommunityRole.exists({
      accountCommunity: e._id,
      role: mongoose.Types.ObjectId(process.env.BEBVERSE_HOLDER_ROLE_ID),
      isValid: !0
    }));
  }
  async backpackClaimed(e) {
    var r = new _CacheService(), c = walletConfig(), t = await this.backpackAddress(e);
    return !!t && ((t = await isDeployedContract(t, {
      network: c.CHAIN_ID,
      apiKey: c.API_KEY
    })) && r.set({
      key: "BackpackClaimed",
      params: {
        account: e._id
      },
      value: t,
      expiresAt: null
    }), t);
  }
  async backpackAddress(e) {
    try {
      var r, c, t, a, s, n, o = (await e?.populate?.("addresses"))?.addresses?.[0]?.address;
      return e && o ? (r = new _CacheService(), c = walletConfig(), t = new ethers.providers.AlchemyProvider(c.CHAIN_ID, c.API_KEY), 
      a = new ethers.Contract(c.FACTORY_CONTRACT_ADDRESS, c.FACTORY_ABI, t), s = (await AccountNonce.findOne({
        account: e._id
      })).salt, n = await a.getAddress(o, s), r.set({
        key: "BackpackAddress",
        params: {
          account: e._id
        },
        value: n,
        expiresAt: null
      }), n) : null;
    } catch (e) {
      return null;
    }
  }
  identities(t) {
    try {
      const c = new FarcasterHubService();
      return {
        _id: t._id,
        farcaster: async (e = 0, r) => {
          return await c.getProfileByAccount(t, r.isExternal);
        },
        ens: async () => {
          await t.populate("addresses");
          var {
            avatarUrl: e,
            twitter: r,
            ens: c
          } = await resolveEnsDataFromAddress(t.addresses[0].address);
          return {
            avatarUrl: e,
            twitter: r,
            ens: c,
            account: t,
            _id: t._id
          };
        }
      };
    } catch (e) {
      return {
        _id: t._id,
        farcaster: null,
        ens: null
      };
    }
  }
}

module.exports = {
  Service: AccountQueryService
};
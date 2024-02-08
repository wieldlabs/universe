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
    var r = new _CacheService(), t = walletConfig(), c = await this.backpackAddress(e);
    return !!c && ((c = await isDeployedContract(c, {
      network: t.CHAIN_ID,
      apiKey: t.API_KEY
    })) && r.set({
      key: "BackpackClaimed",
      params: {
        account: e._id
      },
      value: c,
      expiresAt: null
    }), c);
  }
  async backpackAddress(e) {
    try {
      var r, t, c, s, a, n, o = (await e?.populate?.("addresses"))?.addresses?.[0]?.address;
      return e && o ? (r = new _CacheService(), t = walletConfig(), c = new ethers.providers.AlchemyProvider(t.CHAIN_ID, t.API_KEY), 
      s = new ethers.Contract(t.FACTORY_CONTRACT_ADDRESS, t.FACTORY_ABI, c), a = (await AccountNonce.findOne({
        account: e._id
      })).salt, n = await s.getAddress(o, a), r.set({
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
  identities(c) {
    try {
      const s = new FarcasterHubService();
      return {
        _id: c._id,
        farcaster: async (e = 0, r) => {
          if (r.signerId) {
            const t = await s.getProfileFid(r.signerId);
            return t;
          }
          const t = await s.getProfileByAccount(c, r.isExternal);
          return t;
        },
        ens: async () => {
          await c.populate("addresses");
          var {
            avatarUrl: e,
            twitter: r,
            ens: t
          } = await resolveEnsDataFromAddress(c.addresses[0].address);
          return {
            avatarUrl: e,
            twitter: r,
            ens: t,
            account: c,
            _id: c._id
          };
        }
      };
    } catch (e) {
      return {
        _id: c._id,
        farcaster: null,
        ens: null
      };
    }
  }
}

module.exports = {
  Service: AccountQueryService
};
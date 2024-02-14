const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], _CommunityQuestMutationService = require("../../../services/mutationServices/CommunityQuestMutationService")["Service"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], _AlchemyService = require("../../../services/AlchemyService")["Service"], Account = require("../../../models/Account")["Account"], prod = require("../../../helpers/registrar")["prod"], {
  getMemcachedClient,
  getHash
} = require("../../../connectmemcached"), rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    claimReward: async (e, r, t, a) => {
      a = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: a
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (a) throw new Error(a);
      a = await unauthorizedErrorOrAccount(e, r, t);
      if (!a.account) return a;
      try {
        var s = (await new _CommunityQuestMutationService().claimRewardOrError(e, {
          communityId: r.communityId,
          questId: r.questId,
          questData: r.questData
        }, t))["communityQuest"];
        return {
          communityQuest: s,
          code: "201",
          success: !0,
          message: "Successfully claimed quest reward"
        };
      } catch (e) {
        return (e.message || "").includes("Reward cannot be claimed at this time") || (Sentry.captureException(e), 
        console.error(e)), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    claimRewardByAddress: async (r, t, a, e) => {
      var s, c, i = getMemcachedClient(), e = await rateLimiter({
        root: r,
        args: t,
        context: a,
        info: e
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      try {
        let e = null;
        try {
          var o = await i.get("getAddressPasses_isHolder:" + t.address);
          o && (e = o.value);
        } catch (e) {
          console.error(e);
        }
        if (null === e) {
          var d = new _AlchemyService({
            apiKey: prod().NODE_URL,
            chain: prod().NODE_NETWORK
          }), n = new _AlchemyService({
            apiKey: prod().OPTIMISM_NODE_URL,
            chain: prod().OPTIMISM_NODE_NETWORK
          });
          e = await n.isHolderOfCollection({
            wallet: t.address,
            contractAddress: prod().OPTIMISM_REGISTRAR_ADDRESS
          }), e ||= await d.isHolderOfCollection({
            wallet: t.address,
            contractAddress: prod().REGISTRAR_ADDRESS
          });
          try {
            await i.set("getAddressPasses_isHolder:" + t.address, JSON.stringify(e), {
              lifetime: e ? 86400 : 10
            });
          } catch (e) {
            console.error(e);
          }
        }
        return e ? (s = await Account.findOrCreateByAddressAndChainId({
          address: t.address,
          chainId: 1
        }), c = (await new _CommunityQuestMutationService().claimRewardOrError(r, {
          communityId: t.communityId,
          questId: t.questId,
          questData: t.questData
        }, {
          ...a,
          account: s
        }))["communityQuest"], {
          communityQuest: c,
          code: "201",
          success: !0,
          message: "Successfully claimed quest reward"
        }) : {
          code: "500",
          success: !1,
          message: "You can only claim the reward if you hold a .cast handle in your address."
        };
      } catch (e) {
        return (e.message || "").includes("Reward cannot be claimed at this time") || (Sentry.captureException(e), 
        console.error(e)), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    claimCommunityRewardByAddress: async (r, t, a, e) => {
      var s, c, i = getMemcachedClient(), e = await rateLimiter({
        root: r,
        args: t,
        context: a,
        info: e
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      try {
        let e = null;
        try {
          var o = await i.get("getAddressPasses_isHolder:" + t.address);
          o && (e = o.value);
        } catch (e) {
          console.error(e);
        }
        if (null === e) {
          var d = new _AlchemyService({
            apiKey: prod().NODE_URL,
            chain: prod().NODE_NETWORK
          }), n = new _AlchemyService({
            apiKey: prod().OPTIMISM_NODE_URL,
            chain: prod().OPTIMISM_NODE_NETWORK
          });
          e = await d.isHolderOfCollection({
            wallet: t.address,
            contractAddress: prod().REGISTRAR_ADDRESS
          }), e ||= await n.isHolderOfCollection({
            wallet: t.address,
            contractAddress: prod().OPTIMISM_REGISTRAR_ADDRESS
          });
          try {
            await i.set("getAddressPasses_isHolder:" + t.address, JSON.stringify(e), {
              lifetime: e ? 86400 : 10
            });
          } catch (e) {
            console.error(e);
          }
        }
        return e ? (s = await Account.findOrCreateByAddressAndChainId({
          address: t.address,
          chainId: 1
        }), c = (await new _CommunityQuestMutationService().claimCommunityRewardOrError(r, {
          communityRewardId: t.communityRewardId
        }, {
          ...a,
          account: s
        }))["communityQuest"], {
          communityQuest: c,
          code: "201",
          success: !0,
          message: "Successfully claimed quest reward"
        }) : {
          code: "500",
          success: !1,
          message: "You can only claim the reward if you hold a .cast handle in your address."
        };
      } catch (e) {
        return (e.message || "").includes("Reward cannot be claimed at this time") || (Sentry.captureException(e), 
        console.error(e)), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    }
  }
};

module.exports = {
  resolvers: resolvers
};
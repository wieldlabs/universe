const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], _CommunityQuestMutationService = require("../../../services/mutationServices/CommunityQuestMutationService")["Service"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], _AlchemyService = require("../../../services/AlchemyService")["Service"], Account = require("../../../models/Account")["Account"], prod = require("../../../helpers/registrar")["prod"], rateLimiter = getGraphQLRateLimiter({
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
    claimRewardByAddress: async (e, r, t, a) => {
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
      try {
        var s, c, i = new _AlchemyService({
          apiKey: prod().NODE_URL,
          chain: prod().NODE_NETWORK
        }), o = new _AlchemyService({
          apiKey: prod().OPTIMISM_NODE_URL,
          chain: prod().OPTIMISM_NODE_NETWORK
        }), d = await i.isHolderOfCollection({
          wallet: r.address,
          contractAddress: prod().REGISTRAR_ADDRESS
        });
        return (d ||= await o.isHolderOfCollection({
          wallet: r.address,
          contractAddress: prod().OPTIMISM_REGISTRAR_ADDRESS
        })) ? (s = await Account.findOrCreateByAddressAndChainId({
          address: r.address,
          chainId: 1
        }), c = (await new _CommunityQuestMutationService().claimRewardOrError(e, {
          communityId: r.communityId,
          questId: r.questId,
          questData: r.questData
        }, {
          ...t,
          account: s
        }))["communityQuest"], {
          communityQuest: c,
          code: "201",
          success: !0,
          message: "Successfully claimed quest reward"
        }) : {
          code: "500",
          success: !1,
          message: "You can only claim the reward if you hold a BEB pass in your address."
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
    claimCommunityRewardByAddress: async (e, r, t, a) => {
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
      try {
        var s, c, i = new _AlchemyService({
          apiKey: prod().NODE_URL,
          chain: prod().NODE_NETWORK
        }), o = new _AlchemyService({
          apiKey: prod().OPTIMISM_NODE_URL,
          chain: prod().OPTIMISM_NODE_NETWORK
        }), d = await i.isHolderOfCollection({
          wallet: r.address,
          contractAddress: prod().REGISTRAR_ADDRESS
        });
        return (d ||= await o.isHolderOfCollection({
          wallet: r.address,
          contractAddress: prod().OPTIMISM_REGISTRAR_ADDRESS
        })) ? (s = await Account.findOrCreateByAddressAndChainId({
          address: r.address,
          chainId: 1
        }), c = (await new _CommunityQuestMutationService().claimCommunityRewardOrError(e, {
          communityRewardId: r.communityRewardId
        }, {
          ...t,
          account: s
        }))["communityQuest"], {
          communityQuest: c,
          code: "201",
          success: !0,
          message: "Successfully claimed quest reward"
        }) : {
          code: "500",
          success: !1,
          message: "You can only claim the reward if you hold a BEB pass in your address."
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
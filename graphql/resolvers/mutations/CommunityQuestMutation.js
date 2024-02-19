const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], _CommunityQuestMutationService = require("../../../services/mutationServices/CommunityQuestMutationService")["Service"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], _AlchemyService = require("../../../services/AlchemyService")["Service"], Account = require("../../../models/Account")["Account"], prod = require("../../../helpers/registrar")["prod"], {
  getMemcachedClient,
  getHash
} = require("../../../connectmemcached"), getAddressPasses = require("../../../helpers/farcaster-utils")["getAddressPasses"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    claimReward: async (e, r, t, s) => {
      s = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: s
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (s) throw new Error(s);
      s = await unauthorizedErrorOrAccount(e, r, t);
      if (!s.account) return s;
      try {
        var a = (await new _CommunityQuestMutationService().claimRewardOrError(e, {
          communityId: r.communityId,
          questId: r.questId,
          questData: r.questData
        }, t))["communityQuest"], c = getMemcachedClient(), i = `CommunityQuestService:checkIfCommunityQuestClaimedByAddress${a._id}:` + (t.accountId || t.account?._id);
        return await c.set(i, "true"), {
          communityQuest: a,
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
    claimRewardByAddress: async (e, r, t, s) => {
      s = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: s
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (s) throw new Error(s);
      try {
        var a, c, i, o = (await getAddressPasses(r.address, !0))["isHolder"];
        return o ? (a = await Account.findOrCreateByAddressAndChainId({
          address: r.address,
          chainId: 1
        }), {
          communityQuest: c,
          rewards: i
        } = await new _CommunityQuestMutationService().claimRewardOrError(e, {
          communityId: r.communityId,
          questId: r.questId,
          questData: r.questData
        }, {
          ...t,
          account: a
        }), {
          communityQuest: c,
          rewards: i,
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
    claimCommunityRewardByAddress: async (r, t, s, e) => {
      var a, c, i = getMemcachedClient(), e = await rateLimiter({
        root: r,
        args: t,
        context: s,
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
        return e ? (a = await Account.findOrCreateByAddressAndChainId({
          address: t.address,
          chainId: 1
        }), c = (await new _CommunityQuestMutationService().claimCommunityRewardOrError(r, {
          communityRewardId: t.communityRewardId
        }, {
          ...s,
          account: a
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
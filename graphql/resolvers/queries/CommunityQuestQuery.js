const getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], CommunityQuestService = require("../../../services/CommunityQuestService")["Service"], CommunityQuest = require("../../../models/quests/CommunityQuest")["CommunityQuest"], Account = require("../../../models/Account")["Account"], CommunityReward = require("../../../models/quests/CommunityReward")["CommunityReward"], Score = require("../../../models/Score")["Score"], memcache = require("../../../connectmemcache")["memcache"], resolvers = {
  CommunityQuestQuery: {
    getCommunityQuestStatus: async (e, t, r, i) => {
      i = await rateLimiter({
        root: e,
        args: t,
        context: r,
        info: i
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (i) throw new Error(i);
      await unauthorizedErrorOrAccount(e, t, r);
      i = await CommunityQuest.findOne({
        community: t.communityId,
        quest: t.questId
      });
      return new CommunityQuestService().getQuestStatus(i, {
        communityId: t.communityId,
        questId: t.questId
      }, r);
    },
    getLeaderboard: async (e, {
      communityId: t,
      limit: r
    }) => Score.getLeaderboard(t, r),
    checkIfCommunityQuestClaimedByAddress: async (e, t, r, i) => {
      e = await rateLimiter({
        root: e,
        args: t,
        context: r,
        info: i
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      var m, i = `resolvers:CommunityQuestQuery:checkIfCommunityQuestClaimedByAddress:${t.communityId}:${t.address}:` + t.questId, e = await memcache.get(i);
      return e ? "true" === e.value : !!(e = await Account.findByAddressAndChainId({
        address: t.address,
        chainId: 1
      })) && (m = await CommunityQuest.findOne({
        community: t.communityId,
        quest: t.questId
      }), (m = await new CommunityQuestService().checkIfCommunityQuestClaimedByAddress(m, {
        communityId: t.communityId,
        questId: t.questId
      }, {
        ...r,
        account: e
      })) && await memcache.set(i, "true"), m);
    },
    getCommunityQuestStatusByAddress: async (e, t, r, i) => {
      e = await rateLimiter({
        root: e,
        args: t,
        context: r,
        info: i
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      var m, i = `resolvers:CommunityQuestQuery:getCommunityQuestStatusByAddress:${t.communityId}:${t.address}:` + t.questId, e = await memcache.get(i);
      return e ? e.value : (e = await Account.findOrCreateByAddressAndChainId({
        address: t.address,
        chainId: 1
      }), m = await CommunityQuest.findOne({
        community: t.communityId,
        quest: t.questId
      }), m = await new CommunityQuestService().getQuestStatus(m, {
        communityId: t.communityId,
        questId: t.questId
      }, {
        ...r,
        account: e
      }), await memcache.set(i, m, {
        lifetime: 30
      }), m);
    },
    getCommunityQuest: async (e, t, r, i) => {
      i = await rateLimiter({
        root: e,
        args: t,
        context: r,
        info: i
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (i) throw new Error(i);
      return await unauthorizedErrorOrAccount(e, t, r), await CommunityQuest.findOne({
        community: t.communityId,
        quest: t.questId
      });
    },
    getCommunityRewards: async (e, t, r, i) => {
      e = await rateLimiter({
        root: e,
        args: t,
        context: r,
        info: i
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      return await CommunityReward.findAndSort({
        limit: t.limit,
        offset: t.offset,
        filters: {
          community: t.communityId
        }
      });
    }
  }
};

module.exports = {
  resolvers: resolvers
};
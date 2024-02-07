const getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], CommunityQuestService = require("../../../services/CommunityQuestService")["Service"], CommunityQuest = require("../../../models/quests/CommunityQuest")["CommunityQuest"], Account = require("../../../models/Account")["Account"], CommunityReward = require("../../../models/quests/CommunityReward")["CommunityReward"], Score = require("../../../models/Score")["Score"], getMemcachedClient = require("../../../connectmemcached")["getMemcachedClient"], resolvers = {
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
      i = `resolvers:CommunityQuestQuery:checkIfCommunityQuestClaimedByAddress:${t.communityId}:${t.address}:` + t.questId, 
      e = getMemcachedClient();
      try {
        var o = await e.get(i);
        if (o) return "true" === o.value;
      } catch (e) {
        console.error(e);
      }
      o = await Account.findByAddressAndChainId({
        address: t.address,
        chainId: 1
      });
      if (!o) return !1;
      var u = await CommunityQuest.findOne({
        community: t.communityId,
        quest: t.questId
      }), u = await new CommunityQuestService().checkIfCommunityQuestClaimedByAddress(u, {
        communityId: t.communityId,
        questId: t.questId
      }, {
        ...r,
        account: o
      });
      if (u) try {
        await e.set(i, "true");
      } catch (e) {
        console.error(e);
      } else try {
        await e.set(i, "false", {
          lifetime: 30
        });
      } catch (e) {
        console.error(e);
      }
      return u;
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
      i = `resolvers:CommunityQuestQuery:getCommunityQuestStatusByAddress:${t.communityId}:${t.address}:` + t.questId, 
      e = getMemcachedClient();
      try {
        var o = await e.get(i);
        if (o) return o.value;
      } catch (e) {
        console.error(e);
      }
      var o = await Account.findOrCreateByAddressAndChainId({
        address: t.address,
        chainId: 1
      }), u = await CommunityQuest.findOne({
        community: t.communityId,
        quest: t.questId
      }), u = await new CommunityQuestService().getQuestStatus(u, {
        communityId: t.communityId,
        questId: t.questId
      }, {
        ...r,
        account: o
      });
      try {
        await e.set(i, u, {
          lifetime: 30
        });
      } catch (e) {
        console.error(e);
      }
      return u;
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
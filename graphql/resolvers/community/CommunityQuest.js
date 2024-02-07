const getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], CommunityQuestService = require("../../../services/CommunityQuestService")["Service"], Community = require("../../../models/Community")["Community"], Quest = require("../../../models/quests/Quest")["Quest"], resolvers = {
  CommunityQuest: {
    status: async (e, t, r, i) => {
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
      return await unauthorizedErrorOrAccount(e, t, r), await new CommunityQuestService().getQuestStatus(e, t, r);
    },
    community: async e => Community.findById(e.community),
    quest: async e => Quest.findById(e.quest),
    completedCount: e => e.accounts?.length || 0
  }
};

module.exports = {
  resolvers: resolvers
};
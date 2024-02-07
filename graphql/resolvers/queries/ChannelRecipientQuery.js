const _AccountService = require("../../../services/AccountService")["Service"], getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], resolvers = {
  ChannelRecipientQuery: {
    _id: (e, r, t) => t.accountId,
    getAccountChannelRecipients: async (e, r, t, i) => {
      i = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: i
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (i) throw new Error(i);
      i = await unauthorizedErrorOrAccount(e, r, t);
      if (!i.account) return [];
      try {
        return await new _AccountService().getChannelRecipientsByRolesAndAccount(i.account, {
          ...r
        });
      } catch (e) {
        throw new Error(e);
      }
    }
  }
};

module.exports = {
  resolvers: resolvers
};
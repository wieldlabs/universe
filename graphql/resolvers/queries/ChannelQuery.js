const getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], _AccountService = require("../../../services/AccountService")["Service"], Channel = require("../../../models/Channel")["Channel"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: r => r.id
}), RATE_LIMIT_MAX = 1e4, unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], resolvers = {
  ChannelQuery: {
    _id: (r, e, t) => t.accountId,
    getChannelById: async (r, e, t, n) => {
      r = await rateLimiter({
        root: r,
        args: e,
        context: t,
        info: n
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (r) throw new Error(r);
      try {
        return await Channel.findById(e.id);
      } catch (r) {
        throw new Error(r);
      }
    },
    getAccountChannels: async (r, e, t, n) => {
      n = await rateLimiter({
        root: r,
        args: e,
        context: t,
        info: n
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (n) throw new Error(n);
      n = await unauthorizedErrorOrAccount(r, e, t);
      if (!n.account) return [];
      try {
        return await new _AccountService().getChannelsByRolesAndAccount(n.account, {
          ...e
        });
      } catch (r) {
        throw new Error(r);
      }
    }
  }
};

module.exports = {
  resolvers: resolvers
};
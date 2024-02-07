const {
  SearchService,
  AuthService
} = require("../../../services"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  AccountQuery: {
    _id: () => "AccountQuery",
    getWalletAccountSigninMessage: async (e, r = {}, t, a) => {
      e = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: a
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      return AuthService.getWalletAccountMessageToSign({
        walletEmail: r.walletEmail
      });
    },
    searchAccountByUsernameOrAddressOrEns: async (e, r = {}, t, a) => {
      var i = r["query"], e = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: a
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      return SearchService.searchAccountByUsernameOrAddressOrENS(i);
    },
    searchAccountByIdentity: async (e, r = {}, t, a) => {
      var i = r["query"], e = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: a
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      return SearchService.searchAccountByIdentity(i);
    },
    getAccountSigninMessage: async (e, r = {}, t, a) => {
      var {
        address: i,
        chainId: n
      } = r, e = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: a
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      return AuthService.getMessageToSign({
        address: i,
        chainId: n
      });
    }
  }
};

module.exports = {
  resolvers: resolvers
};
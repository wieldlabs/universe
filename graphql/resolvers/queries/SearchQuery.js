const SearchService = require("../../../services")["SearchService"], getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  SearchQuery: {
    searchAccountByUsernameOrAddressOrEns: async (e, r = {}, t, i) => {
      var a = r["query"], e = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: i
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      return SearchService.searchAccountByUsernameOrAddressOrENS(a);
    }
  }
};

module.exports = {
  resolvers: resolvers
};
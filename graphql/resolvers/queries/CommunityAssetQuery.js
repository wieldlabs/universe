const getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: t => t.id
}), RATE_LIMIT_MAX = 1e4, CommunityAsset = require("../../../models/assets/CommunityAsset")["CommunityAsset"], resolvers = {
  CommunityAssetQuery: {
    getCommunityAssets: async (t, e, r, i) => {
      t = await rateLimiter({
        root: t,
        args: e,
        context: r,
        info: i
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (t) throw new Error(t);
      return CommunityAsset.findAndSort({
        filters: e.filters,
        limit: e.limit,
        offset: e.offset,
        sort: e.sort
      });
    }
  }
};

module.exports = {
  resolvers: resolvers
};
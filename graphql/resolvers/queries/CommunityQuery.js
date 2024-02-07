const getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, Community = require("../../../models/Community")["Community"], SearchService = require("../../../services")["SearchService"], resolvers = {
  CommunityQuery: {
    _id: () => "CommunityQuery",
    getCommunityByDomainOrTokenId: async (e, r, i, t) => {
      e = await rateLimiter({
        root: e,
        args: r,
        context: i,
        info: t
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      if (r.bebdomain || r.tokenId) return t = r.tld || "beb", r.bebdomain ? await Community.findOne({
        bebdomain: r.bebdomain,
        tld: t
      }) || {
        bebdomain: r.bebdomain,
        tld: t
      } : i.dataloaders.communities.load(r.tokenId);
      throw new Error("Missing bebdomain or tokenId");
    },
    getCommunityById: async (e, r, i, t) => {
      e = await rateLimiter({
        root: e,
        args: r,
        context: i,
        info: t
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      return Community.findById(r.id);
    },
    searchCommunityByDomainOrName: async (e, r, i, t) => {
      e = await rateLimiter({
        root: e,
        args: r,
        context: i,
        info: t
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      return SearchService.searchCommunityByDomainOrName(r.query);
    }
  }
};

module.exports = {
  resolvers: resolvers
};
const getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, Quest = require("../../../models/quests/Quest")["Quest"], Community = require("../../../models/Community")["Community"], {
  memcache,
  getHash
} = require("../../../connectmemcache"), resolvers = {
  QuestQuery: {
    getQuests: async (e, t, i, r) => {
      e = await rateLimiter({
        root: e,
        args: t,
        context: i,
        info: r
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      var i = JSON.stringify(t), r = await memcache.get(getHash("QuestQuery:getQuests:" + i));
      if (r) return JSON.parse(r.value).map(e => new Quest(e));
      t.filters?.domains?.length && (e = await Community.find({
        bebdomain: {
          $in: t.filters.domains
        }
      }).select("_id"), t.filters.communities = e.map(e => e._id)), t.filters?.domain && (r = await Community.findOne({
        bebdomain: t.filters.domain
      }).select("_id"), t.filters.community = r?._id);
      e = await Quest.findAndSort({
        limit: t.limit,
        offset: t.offset,
        sort: t.sort,
        filters: t.filters
      });
      return await memcache.set(getHash("QuestQuery:getQuests:" + i), JSON.stringify(e), {
        lifetime: 3600
      }), e;
    }
  }
};

module.exports = {
  resolvers: resolvers
};
const getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, Quest = require("../../../models/quests/Quest")["Quest"], Community = require("../../../models/Community")["Community"], {
  getMemcachedClient,
  getHash
} = require("../../../connectmemcached"), resolvers = {
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
      i = JSON.stringify(t), r = getMemcachedClient();
      try {
        const s = await r.get(getHash("QuestQuery:getQuests:" + i));
        if (s) return JSON.parse(s.value).map(e => new Quest(e));
      } catch (e) {
        console.error(e);
      }
      t.filters?.domains?.length && (e = await Community.find({
        bebdomain: {
          $in: t.filters.domains
        }
      }).select("_id"), t.filters.communities = e.map(e => e._id)), t.filters?.domain && (e = await Community.findOne({
        bebdomain: t.filters.domain
      }).select("_id"), t.filters.community = e?._id);
      const s = await Quest.findAndSort({
        limit: t.limit,
        offset: t.offset,
        sort: t.sort,
        filters: t.filters
      });
      try {
        await r.set(getHash("QuestQuery:getQuests:" + i), JSON.stringify(s), {
          lifetime: 3600
        });
      } catch (e) {
        console.error(e);
      }
      return s;
    }
  }
};

module.exports = {
  resolvers: resolvers
};
const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], _CommunityRoomService = require("../../../services/CommunityRoomService")["Service"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    getPeers: async (e, r, t, o) => {
      o = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: o
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (o) throw new Error(o);
      o = await unauthorizedErrorOrAccount(e, r, t);
      if (!o.account) return o;
      try {
        return {
          peers: await new _CommunityRoomService().getPeers(e, {
            communityId: r.communityId
          }, t),
          code: "201",
          success: !0,
          message: "Successfully retrieved peers from communityRoom and removed expired"
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    setPeer: async (e, r, t, o) => {
      o = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: o
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (o) throw new Error(o);
      o = await unauthorizedErrorOrAccount(e, r, t);
      if (!o.account) return o;
      try {
        return {
          peers: await new _CommunityRoomService().setPeer(e, {
            communityId: r.communityId,
            peerId: r.peerId,
            account: o.account
          }, t),
          code: "201",
          success: !0,
          message: "Successfully setPeer on communityRoom"
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    }
  }
};

module.exports = {
  resolvers: resolvers
};
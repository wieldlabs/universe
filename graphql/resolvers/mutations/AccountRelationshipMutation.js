const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], AccountRelationship = require("../../../models/AccountRelationship")["AccountRelationship"], NotificationService = require("../../../services")["NotificationService"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    toggleFollow: async (e, t, r, o) => {
      o = await rateLimiter({
        root: e,
        args: t,
        context: r,
        info: o
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (o) throw new Error(o);
      o = await unauthorizedErrorOrAccount(e, t, r);
      if (!o.account) return o;
      try {
        var i = await AccountRelationship.toggleFollow({
          from: o.account._id,
          ...t
        });
        return NotificationService.createConnectionRequestNotification(e, {
          relationship: i
        }, r), {
          code: "201",
          success: !0,
          message: "Successfully updated AccountRelationship",
          relationship: i
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    toggleBlock: async (e, t, r, o) => {
      o = await rateLimiter({
        root: e,
        args: t,
        context: r,
        info: o
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (o) throw new Error(o);
      o = await unauthorizedErrorOrAccount(e, t, r);
      if (!o.account) return o;
      try {
        return {
          code: "201",
          success: !0,
          message: "Successfully updated AccountRelationship",
          relationship: await AccountRelationship.toggleBlock({
            from: o.account._id,
            ...t
          })
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
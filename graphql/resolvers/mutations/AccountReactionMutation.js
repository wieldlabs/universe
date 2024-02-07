const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], AccountReaction = require("../../../models/AccountReaction")["AccountReaction"], {
  NotificationService,
  ExpService
} = require("../../../services"), unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    reactForPost: async (e, t, r, o) => {
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
        var [ c, a ] = await AccountReaction.reactForPost({
          accountId: o.account._id,
          ...t,
          amount: t.amount ? -1 === t.amount ? -1 : 1 : 0
        });
        return NotificationService.reactForPostNotification(e, {
          post: c,
          accountReaction: a
        }, r), ExpService.awardReactionExp(e, {
          post: c,
          accountReaction: a
        }, r), {
          code: "201",
          success: !0,
          message: "Successfully created post",
          post: c,
          accountReaction: a
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
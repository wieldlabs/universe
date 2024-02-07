const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], ThreadMessage = require("../../../models/ThreadMessage")["ThreadMessage"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], NotificationService = require("../../../services")["NotificationService"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    createThreadMessage: async (e, r, t, a) => {
      a = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: a
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (a) throw new Error(a);
      a = await unauthorizedErrorOrAccount(e, r, t);
      if (!a.account) return a;
      try {
        var i = await ThreadMessage.createForThread({
          senderId: a.account._id,
          ...r
        });
        return NotificationService.createThreadMessageNotification(e, {
          threadMessage: i
        }, t), {
          code: "201",
          success: !0,
          message: "Successfully created thread message",
          threadMessage: i
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
const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], Notification = require("../../../models/Notification")["Notification"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    updateUnseenNotifications: async (e, t, r, i) => {
      i = await rateLimiter({
        root: e,
        args: t,
        context: r,
        info: i
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (i) throw new Error(i);
      i = await unauthorizedErrorOrAccount(e, t, r);
      if (!i.account) return i;
      try {
        return {
          code: "201",
          success: !0,
          message: "Successfully updated notification",
          count: await Notification.updateUnseenNotifications({
            accountId: i.account._id
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
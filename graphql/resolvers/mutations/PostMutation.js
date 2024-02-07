const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], {
  NotificationService,
  PostService
} = require("../../../services"), rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    hidePost: async (e, r, t, o) => {
      var i = await unauthorizedErrorOrAccount(e, r, t);
      if (!i.account) return i;
      try {
        var a = await rateLimiter({
          root: e,
          args: r,
          context: t,
          info: o
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (a) throw new Error(a);
        return {
          code: "201",
          success: !0,
          message: "Successfully hide post",
          post: await PostService.hidePostOrUnauthorized(e, r, t)
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    createPostOrReplyForAccount: async (e, r, t, o) => {
      var i = await unauthorizedErrorOrAccount(e, r, t);
      if (!i.account) return i;
      try {
        var a = await rateLimiter({
          root: e,
          args: r,
          context: t,
          info: o
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (a) throw new Error(a);
        var c = await PostService.createPostOrUnauthorized(e, r, t);
        return NotificationService.createReplyNotification(e, {
          post: c
        }, t), NotificationService.createMentionsNotification(e, {
          post: c
        }, t), {
          code: "201",
          success: !0,
          message: "Successfully created post",
          post: c
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
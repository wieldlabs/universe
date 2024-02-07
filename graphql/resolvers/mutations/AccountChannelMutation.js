const AccountChannel = require("../../../models/AccountChannel")["AccountChannel"], signedInAccountIdOrNull = require("../../../helpers/auth-middleware")["signedInAccountIdOrNull"], Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    updateAccountChannelLastSeen: async (e, t, n, r) => {
      e = await rateLimiter({
        root: e,
        args: t,
        context: n,
        info: r
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      try {
        var a = signedInAccountIdOrNull(n);
        return a ? {
          code: "200",
          success: !0,
          message: "Successfully updated account channel",
          accountChannel: await AccountChannel.updateAccountChannelLastSeen({
            accountId: a,
            ...t
          })
        } : {
          code: "403",
          success: !1,
          message: "Unauthorized"
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
const AccountCommunity = require("../../../models/AccountCommunity")["AccountCommunity"], AccessControlService = require("../../../services")["AccessControlService"], signedInAccountIdOrNull = require("../../../helpers/auth-middleware")["signedInAccountIdOrNull"], Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    updateAccountCommunityLastSeen: async (e, t, c, o) => {
      o = await rateLimiter({
        root: e,
        args: t,
        context: c,
        info: o
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (o) throw new Error(o);
      try {
        var r = signedInAccountIdOrNull(c);
        return await AccessControlService.accountCommunityByCommunityIdControl(e, t, c) && r ? {
          code: "200",
          success: !0,
          message: "Successfully updated account community",
          accountCommunity: await AccountCommunity.updateAccountCommunityLastSeen({
            accountId: r,
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
    },
    joinOrLeaveAccountCommunity: async (e, t, c, o) => {
      o = await rateLimiter({
        root: e,
        args: t,
        context: c,
        info: o
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (o) throw new Error(o);
      try {
        var r = signedInAccountIdOrNull(c);
        return await AccessControlService.accountCommunityByCommunityIdControl(e, t, c) && r ? {
          code: "200",
          success: !0,
          message: "Successfully updated account community",
          accountCommunity: await AccountCommunity.updateAccountCommunityJoined({
            accountId: r,
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
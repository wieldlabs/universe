const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], _RoleMutationService = require("../../../services/mutationServices/RoleMutationService")["Service"], AccountService = require("../../../services")["AccountService"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, RoleMutationService = new _RoleMutationService(), resolvers = {
  Mutation: {
    grantRole: async (e, r, t, o) => {
      try {
        var c = await rateLimiter({
          root: e,
          args: r,
          context: t,
          info: o
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (c) throw new Error(c);
        var a = await unauthorizedErrorOrAccount(e, r, t);
        return a.account ? {
          code: "201",
          success: !0,
          message: "Successfully granted role",
          accountCommunityRole: await RoleMutationService.grantRoleOrUnauthorized(e, r, t)
        } : a;
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    revokeRole: async (e, r, t, o) => {
      try {
        var c = await rateLimiter({
          root: e,
          args: r,
          context: t,
          info: o
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (c) throw new Error(c);
        var a = await unauthorizedErrorOrAccount(e, r, t);
        return a.account ? {
          code: "201",
          success: !0,
          message: "Successfully revoked role",
          accountCommunityRole: await RoleMutationService.revokeRoleOrUnauthorized(e, r, t)
        } : a;
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    claimRole: async (e, r, t, o) => {
      try {
        var c = await rateLimiter({
          root: e,
          args: r,
          context: t,
          info: o
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (c) throw new Error(c);
        var a = await unauthorizedErrorOrAccount(e, r, t);
        return a.account ? {
          code: "201",
          success: !0,
          message: "Successfully claimed role",
          accountCommunityRole: await AccountService.claimRole(a.account, r, t)
        } : a;
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
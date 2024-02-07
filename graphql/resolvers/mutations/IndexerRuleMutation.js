const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], _RoleMutationService = require("../../../services/mutationServices/RoleMutationService")["Service"], _IndexerRuleMutationService = require("../../../services/mutationServices/IndexerRuleMutationService")["Service"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    createIndexerRuleForRole: async (e, r, t, i) => {
      try {
        var o = await rateLimiter({
          root: e,
          args: r,
          context: t,
          info: i
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (o) throw new Error(o);
        var a = await unauthorizedErrorOrAccount(e, r, t);
        return a.account ? {
          code: "201",
          success: !0,
          message: "Successfully created indexer rule",
          indexerRule: await new _RoleMutationService().createIndexerRuleForRoleOrUnauthorized(e, r, t)
        } : a;
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    editIndexerRule: async (e, r, t, i) => {
      try {
        var o = await rateLimiter({
          root: e,
          args: r,
          context: t,
          info: i
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (o) throw new Error(o);
        var a = await unauthorizedErrorOrAccount(e, r, t);
        return a.account ? {
          code: "201",
          success: !0,
          message: "Successfully edited indexer rule",
          indexerRule: await new _IndexerRuleMutationService().editIndexerRuleOrUnauthorized(e, r, t)
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
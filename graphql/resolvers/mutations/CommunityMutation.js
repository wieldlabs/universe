const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], _RegistrarService = require("../../../services/RegistrarService")["Service"], _CommunityMutationService = require("../../../services/mutationServices/CommunityMutationService")["Service"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, CommunityMutationService = new _CommunityMutationService(), resolvers = {
  Mutation: {
    editCommunity: async (e, r, t, i) => {
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
        var c = await unauthorizedErrorOrAccount(e, r, t);
        return c.account ? {
          code: "201",
          success: !0,
          message: "Successfully edited community",
          community: await CommunityMutationService.editCommunityOrUnauthorized(e, r, t)
        } : c;
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    editCommunityAddressScore: async (e, r, t, i) => {
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
        var c = await unauthorizedErrorOrAccount(e, r, t);
        return c.account ? {
          code: "201",
          success: !0,
          message: "Successfully edited community address score",
          community: await CommunityMutationService.editCommunityAddressScoreIfAuthorized(e, r, t)
        } : c;
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    registerCommunity: async (e, r, t, i) => {
      var o = t.services?.RegistrarService || new _RegistrarService();
      try {
        var c = await rateLimiter({
          root: e,
          args: r,
          context: t,
          info: i
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (c) throw new Error(c);
        var a = await unauthorizedErrorOrAccount(e, r, t);
        return a.account ? {
          code: "201",
          success: !0,
          message: "Successfully registered community",
          community: await o.registerCommunity(e, r, t)
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
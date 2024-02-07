const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], _PaymasterService = require("../../../services/PaymasterService")["Service"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    requestGasAndPaymasterAndData: async (e, r, t, a) => {
      e = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: a
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      try {
        return {
          code: "201",
          success: !0,
          message: "Successfully requested paymaster",
          ...await new _PaymasterService({
            apiKey: process.env.PAYMASTER_API_KEY
          }).handlePaymaster(r)
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
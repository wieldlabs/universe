const getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], Role = require("../../../models/Role")["Role"], AccountService = require("../../../services")["AccountService"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  RoleQuery: {
    _id: () => "RoleQuery",
    getRoleById: async (e, r, t, o) => {
      e = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: o
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      return Role.findById(r.id);
    },
    canClaimRole: async (e, r, t, o) => {
      o = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: o
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (o) throw new Error(o);
      o = await unauthorizedErrorOrAccount(e, r, t);
      return !!o.account && AccountService.canClaimRole(o.account, r);
    }
  }
};

module.exports = {
  resolvers: resolvers
};
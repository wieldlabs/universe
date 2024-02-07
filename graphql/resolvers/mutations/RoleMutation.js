const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], _RoleMutationService = require("../../../services/mutationServices/RoleMutationService")["Service"], _CommunityMutationService = require("../../../services/mutationServices/CommunityMutationService")["Service"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    createRoleForCommunity: async (e, {
      communityId: r,
      roleInput: t,
      ruleDataInputs: o
    }, a, i) => {
      var n = new _CommunityMutationService();
      try {
        var c = await rateLimiter({
          root: e,
          args: {
            communityId: r,
            roleInput: t,
            ruleDataInputs: o
          },
          context: a,
          info: i
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (c) throw new Error(c);
        var u, s = await unauthorizedErrorOrAccount(e, {
          communityId: r,
          roleInput: t,
          ruleDataInputs: o
        }, a);
        return s.account ? (u = await n.createRoleForCommunityOrUnauthorized(e, {
          communityId: r,
          roleInput: t
        }, a), o && 0 < o.length && await new _RoleMutationService().createIndexerRuleForRoleOrUnauthorized(e, {
          roleId: u._id,
          ruleDataInput: o[0]
        }, a), {
          code: "201",
          success: !0,
          message: "Successfully created role",
          role: u
        }) : s;
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    editRole: async (e, {
      roleId: r,
      roleInput: t
    }, o, a) => {
      try {
        var i = await rateLimiter({
          root: e,
          args: {
            roleId: r,
            roleInput: t
          },
          context: o,
          info: a
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (i) throw new Error(i);
        var n = await unauthorizedErrorOrAccount(e, {
          roleId: r,
          roleInput: t
        }, o);
        return n.account ? {
          code: "201",
          success: !0,
          message: "Successfully edited role",
          role: await new _RoleMutationService().editRoleOrUnauthorized(e, {
            roleId: r,
            roleInput: t
          }, o)
        } : n;
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    deleteRole: async (e, {
      roleId: r
    }, t, o) => {
      try {
        var a = await rateLimiter({
          root: e,
          args: {
            roleId: r
          },
          context: t,
          info: o
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (a) throw new Error(a);
        var i = await unauthorizedErrorOrAccount(e, {
          roleId: r
        }, t);
        return i.account ? {
          code: "201",
          success: !0,
          message: "Successfully deleted role",
          roleId: await new _RoleMutationService().deleteRoleOrUnauthorized(e, {
            roleId: r
          }, t)
        } : i;
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    updateRolePermissions: async (e, r, t, o) => {
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
        var i = await unauthorizedErrorOrAccount(e, r, t);
        return i.account ? {
          code: "201",
          success: !0,
          message: "Successfully edited role",
          role: await new _RoleMutationService().updateRolePermissionsOrUnauthorized(e, r, t)
        } : i;
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
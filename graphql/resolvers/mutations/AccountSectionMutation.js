const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], AccountSection = require("../../../models/AccountSection")["AccountSection"], {
  unauthorizedErrorOrAccount,
  unauthorizedResponse
} = require("../../../helpers/auth-middleware"), rateLimiter = getGraphQLRateLimiter({
  identifyContext: t => t.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    addAccountSection: async (t, e, c, r) => {
      r = await rateLimiter({
        root: t,
        args: e,
        context: c,
        info: r
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (r) throw new Error(r);
      r = await unauthorizedErrorOrAccount(t, e, c);
      if (!r.account) return r;
      try {
        return {
          code: "201",
          success: !0,
          message: "Successfully created account section",
          accountSection: await AccountSection.addDefaultToAccount({
            accountId: r.account._id,
            ...e
          })
        };
      } catch (t) {
        return {
          code: "500",
          success: !1,
          message: t.message
        };
      }
    },
    updateAccountSection: async (t, e, c, r) => {
      r = await rateLimiter({
        root: t,
        args: e,
        context: c,
        info: r
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (r) throw new Error(r);
      r = await unauthorizedErrorOrAccount(t, e, c);
      if (!r.account) return r;
      try {
        var o = await AccountSection.findById(e.accountSectionId);
        return o && o.account.toString() === r.account._id.toString() ? {
          code: "200",
          success: !0,
          message: "Successfully updated account section",
          accountSection: await o.updateMe(e)
        } : unauthorizedResponse;
      } catch (t) {
        return Sentry.captureException(t), console.error(t), {
          code: "500",
          success: !1,
          message: t.message
        };
      }
    },
    deleteAccountSection: async (t, e, c, r) => {
      r = await rateLimiter({
        root: t,
        args: e,
        context: c,
        info: r
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (r) throw new Error(r);
      r = await unauthorizedErrorOrAccount(t, e, c);
      if (!r.account) return r;
      try {
        var o = await AccountSection.findById(e.accountSectionId);
        return o && o.account.toString() === r.account._id.toString() ? {
          code: "200",
          success: !0,
          message: "Successfully deleted account section",
          accountSection: {
            _id: await o.deleteMe()
          }
        } : unauthorizedResponse;
      } catch (t) {
        return Sentry.captureException(t), console.error(t), {
          code: "500",
          success: !1,
          message: t.message
        };
      }
    },
    updateAccountSectionEntry: async (t, {
      accountSectionId: e,
      entryId: c,
      ...r
    }, o, n) => {
      n = await rateLimiter({
        root: t,
        args: r,
        context: o,
        info: n
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (n) throw new Error(n);
      n = await unauthorizedErrorOrAccount(t, r, o);
      if (!n.account) return n;
      try {
        var a = await AccountSection.findById(e);
        return a && a.account.toString() === n.account._id.toString() ? {
          code: "200",
          success: !0,
          message: "Successfully updated account section entry",
          accountSection: await a.updateEntry(c, r)
        } : unauthorizedResponse;
      } catch (t) {
        return Sentry.captureException(t), console.error(t), {
          code: "500",
          success: !1,
          message: t.message
        };
      }
    },
    addAccountSectionEntry: async (t, {
      accountSectionId: e,
      ...c
    }, r, o) => {
      o = await rateLimiter({
        root: t,
        args: c,
        context: r,
        info: o
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (o) throw new Error(o);
      o = await unauthorizedErrorOrAccount(t, c, r);
      if (!o.account) return o;
      try {
        var n = await AccountSection.findById(e);
        return n && n.account.toString() === o.account._id.toString() ? {
          code: "200",
          success: !0,
          message: "Successfully updated account section entry",
          accountSection: await n.addDefauEntry()
        } : unauthorizedResponse;
      } catch (t) {
        return Sentry.captureException(t), console.error(t), {
          code: "500",
          success: !1,
          message: t.message
        };
      }
    },
    deleteAccountSectionEntry: async (t, {
      accountSectionId: e,
      entryId: c,
      ...r
    }, o, n) => {
      n = await rateLimiter({
        root: t,
        args: r,
        context: o,
        info: n
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (n) throw new Error(n);
      n = await unauthorizedErrorOrAccount(t, r, o);
      if (!n.account) return n;
      try {
        var a = await AccountSection.findById(e);
        return a && a.account.toString() === n.account._id.toString() ? {
          code: "200",
          success: !0,
          message: "Successfully deleted account section entry",
          accountSection: await a.deleteEntry(c)
        } : unauthorizedResponse;
      } catch (t) {
        return Sentry.captureException(t), console.error(t), {
          code: "500",
          success: !1,
          message: t.message
        };
      }
    }
  }
};

module.exports = {
  resolvers: resolvers
};
const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], Account = require("../../../models/Account")["Account"], Post = require("../../../models/Post")["Post"], {
  AuthService,
  AccountService,
  AccountRecovererService
} = require("../../../services"), unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    createAccountFromAddress: async (e, r, c, t) => {
      e = await rateLimiter({
        root: e,
        args: r,
        context: c,
        info: t
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      try {
        return {
          code: "201",
          success: !0,
          message: "Successfully created account",
          account: await Account.createFromAddress(r)
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    authByEncryptedWalletJson: async (e, r, c, t) => {
      e = await rateLimiter({
        root: e,
        args: r,
        context: c,
        info: t
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      try {
        var {
          account: a,
          accessToken: o
        } = await AuthService.authByEncryptedWalletJson(r);
        return {
          code: "201",
          success: !0,
          message: "Successfully created account",
          account: a,
          accessToken: o
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    addEncryptedWalletJson: async (e, r, c, t) => {
      t = await rateLimiter({
        root: e,
        args: r,
        context: c,
        info: t
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (t) throw new Error(t);
      try {
        var a = await unauthorizedErrorOrAccount(e, r, c);
        return a.account ? {
          code: "200",
          success: !0,
          message: "Succesfully updated account",
          account: await a.account.addEncryptedWalletJson(r.encyrptedWalletJson)
        } : a;
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    updateCurrentAddress: async (e, r, c, t) => {
      t = await rateLimiter({
        root: e,
        args: r,
        context: c,
        info: t
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (t) throw new Error(t);
      t = await unauthorizedErrorOrAccount(e, r, c);
      if (!t.account) return t;
      try {
        return {
          code: "200",
          success: !0,
          message: "Succesfully updated account",
          accountAddress: await AccountService.updateCurrentAddress(t.account, r),
          account: t.account
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    claimAllRoles: async (e, r, c, t) => {
      t = await rateLimiter({
        root: e,
        args: r,
        context: c,
        info: t
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (t) throw new Error(t);
      t = await unauthorizedErrorOrAccount(e, r, c);
      if (!t.account) return t;
      try {
        var a = await AccountService.claimRoles(t.account, {
          communityId: r.communityId
        });
        return {
          code: "200",
          success: !0,
          message: "Succesfully claimed roles",
          account: t.account,
          roles: a
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    deleteAccount: async (e, r, c, t) => {
      try {
        var a = await rateLimiter({
          root: e,
          args: r,
          context: c,
          info: t
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (a) throw new Error(a);
        var o = await unauthorizedErrorOrAccount(e, r, c);
        return o.account ? (await Account.deleteAllData({
          account: o.account
        }), {
          code: "200",
          success: !0,
          message: "Succesfully deleted account"
        }) : o;
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    updateCurrentAccount: async (e, r, c, t) => {
      t = await rateLimiter({
        root: e,
        args: r,
        context: c,
        info: t
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (t) throw new Error(t);
      t = await unauthorizedErrorOrAccount(e, r, c);
      if (!t.account) return t;
      try {
        return {
          code: "200",
          success: !0,
          message: "Succesfully updated account",
          account: await t.account.updateMe(r)
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    addRecoverer: async (e, r, c, t) => {
      t = await rateLimiter({
        root: e,
        args: r,
        context: c,
        info: t
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (t) throw new Error(t);
      t = await unauthorizedErrorOrAccount(e, r, c);
      if (!t.account) return t;
      try {
        return {
          code: "200",
          success: !0,
          message: "Succesfully added recoverer",
          account: await AccountRecovererService.addRecoverer(t.account, r)
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    authBySignature: async (e, r, c, t) => {
      e = await rateLimiter({
        root: e,
        args: r,
        context: c,
        info: t
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      try {
        var {
          account: a,
          accessToken: o
        } = await AuthService.authenticate(r);
        return {
          code: "201",
          success: !0,
          message: "Successfully authenticated",
          account: a,
          accessToken: o
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
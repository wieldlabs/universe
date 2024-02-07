const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], Thread = require("../../../models/Thread")["Thread"], AccountThread = require("../../../models/AccountThread")["AccountThread"], ThreadTransaction = require("../../../models/ThreadTransaction")["ThreadTransaction"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], getAddressFromEnsOrAddress = require("../../../helpers/get-address-from-ens")["getAddressFromEnsOrAddress"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    createThread: async (e, r, t, a) => {
      a = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: a
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (a) throw new Error(a);
      a = await unauthorizedErrorOrAccount(e, r, t);
      if (!a.account) return a;
      try {
        var c = await getAddressFromEnsOrAddress(r.recipientAddress), [ o, s ] = await Thread.createThread({
          fromAccountId: a.account._id,
          ...r,
          recipientAddress: c
        });
        return {
          code: "201",
          success: !0,
          message: "Successfully created thread",
          thread: o,
          accountThreads: s
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    createStakedThread: async (e, r, t, a) => {
      a = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: a
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (a) throw new Error(a);
      a = await unauthorizedErrorOrAccount(e, r, t);
      if (!a.account) return a;
      try {
        var [ c, o ] = await Thread.createStakedThread({
          senderId: a.account._id,
          ...r
        });
        return {
          code: "201",
          success: !0,
          message: "Successfully created thread",
          thread: c,
          threadTransaction: o
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    updateAccountThreadLastSeen: async (e, r, t, a) => {
      a = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: a
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (a) throw new Error(a);
      a = await unauthorizedErrorOrAccount(e, r, t);
      if (!a.account) return a;
      try {
        return {
          code: "200",
          success: !0,
          message: "Successfully updated thread",
          accountThread: await AccountThread.updateAccountThreadLastSeen({
            accountId: a.account._id,
            ...r
          })
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    acceptAccountThread: async (e, r, t, a) => {
      a = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: a
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (a) throw new Error(a);
      a = await unauthorizedErrorOrAccount(e, r, t);
      if (!a.account) return a;
      try {
        return {
          code: "200",
          success: !0,
          message: "Successfully accepeted thread",
          accountThread: await AccountThread.acceptAccountThread({
            accountId: a.account._id,
            ...r
          })
        };
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    completeThreadTransaction: async (e, r, t, a) => {
      a = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: a
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (a) throw new Error(a);
      a = await unauthorizedErrorOrAccount(e, r, t);
      if (!a.account) return a;
      try {
        return {
          code: "200",
          success: !0,
          message: "Successfully completed thread transaction",
          threadTransaction: await ThreadTransaction.completeTransaction({
            ...r
          })
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
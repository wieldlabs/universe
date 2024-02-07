const Sentry = require("@sentry/node"), getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], _ChannelMutationService = require("../../../services/mutationServices/ChannelMutationService")["Service"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Mutation: {
    addChannelForCommunity: async (e, {
      communityId: n,
      channelInput: r,
      recipients: t
    }, a, c) => {
      try {
        var i = await rateLimiter({
          root: e,
          args: {
            communityId: n,
            channelInput: r,
            recipients: t
          },
          context: a,
          info: c
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (i) throw new Error(i);
        var o = await unauthorizedErrorOrAccount(e, {
          communityId: n,
          channelInput: r,
          recipients: t
        }, a);
        return o.account ? {
          code: "201",
          success: !0,
          message: "Successfully created channel",
          channel: await new _ChannelMutationService().createChannelForCommunityOrUnauthorized(e, {
            communityId: n,
            channelInput: r,
            recipients: t
          }, a)
        } : o;
      } catch (e) {
        return Sentry.captureException(e), console.error(e), {
          code: "500",
          success: !1,
          message: e.message
        };
      }
    },
    editChannel: async (e, {
      channelId: n,
      channelInput: r
    }, t, a) => {
      try {
        var c = await rateLimiter({
          root: e,
          args: {
            channelId: n,
            channelInput: r
          },
          context: t,
          info: a
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (c) throw new Error(c);
        var i = await unauthorizedErrorOrAccount(e, {
          channelId: n,
          channelInput: r
        }, t);
        return i.account ? {
          code: "201",
          success: !0,
          message: "Successfully edited channel",
          channel: await new _ChannelMutationService().editChannelForCommunityOrUnauthorized(e, {
            channelId: n,
            channelInput: r
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
    deleteChannel: async (e, {
      channelId: n
    }, r, t) => {
      try {
        var a = await rateLimiter({
          root: e,
          args: {
            channelId: n
          },
          context: r,
          info: t
        }, {
          max: RATE_LIMIT_MAX,
          window: "10s"
        });
        if (a) throw new Error(a);
        var c = await unauthorizedErrorOrAccount(e, {
          channelId: n
        }, r);
        return c.account ? {
          code: "201",
          success: !0,
          message: "Successfully deleted channel",
          channelId: await new _ChannelMutationService().deleteChannelForCommunityOrUnauthorized(e, {
            channelId: n
          }, r)
        } : c;
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
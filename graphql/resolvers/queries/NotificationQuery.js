const Notification = require("../../../models/Notification")["Notification"], getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: t => t.id
}), RATE_LIMIT_MAX = 1e4, unauthorizedErrorOrAccount = require("../../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], resolvers = {
  NotificationQuery: {
    _id: (t, i, r) => r.accountId,
    getAccountNotifications: async (t, i, r, e) => {
      e = await rateLimiter({
        root: t,
        args: i,
        context: r,
        info: e
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      e = await unauthorizedErrorOrAccount(t, i, r);
      return e.account ? Notification.find({
        receiver: e.account._id,
        initiator: {
          $ne: e.account._id
        }
      }).sort("-createdAt").skip(i.offset || 0).limit(i.limit || 20) : [];
    },
    counUnseenNotifications: async (t, i, r, e) => {
      e = await rateLimiter({
        root: t,
        args: i,
        context: r,
        info: e
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      e = await unauthorizedErrorOrAccount(t, i, r);
      return e.account ? Notification.count({
        receiver: e.account._id,
        initiator: {
          $ne: e.account._id
        },
        lastSeen: null
      }) : 0;
    }
  }
};

module.exports = {
  resolvers: resolvers
};
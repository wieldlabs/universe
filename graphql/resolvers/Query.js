const getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], Account = require("../../models/Account")["Account"], Thread = require("../../models/Thread")["Thread"], AccountReaction = require("../../models/AccountReaction")["AccountReaction"], AccountRelationship = require("../../models/AccountRelationship")["AccountRelationship"], Notification = require("../../models/Notification")["Notification"], Community = require("../../models/Community")["Community"], {
  AccountService,
  PostService
} = require("../../services"), FarcasterServiceV2 = require("../../services/identities/FarcasterServiceV2")["Service"], _ScoreService = require("../../services/ScoreService")["Service"], NotificationQueryResolvers = require("./queries/NotificationQuery")["resolvers"], SearchQueryResolvers = require("./queries/SearchQuery")["resolvers"], CommunityQueryResolvers = require("./queries/CommunityQuery")["resolvers"], RoleQueryResolvers = require("./queries/RoleQuery")["resolvers"], AccountQueryResolvers = require("./queries/AccountQuery")["resolvers"], QuestQueryResolvers = require("./queries/QuestQuery")["resolvers"], ChannelRecipientQueryResolvers = require("./queries/ChannelRecipientQuery")["resolvers"], ChannelQueryResolvers = require("./queries/ChannelQuery")["resolvers"], CommunityQuestQueryResolvers = require("./queries/CommunityQuestQuery")["resolvers"], CommunityAssetQueryResolvers = require("./queries/CommunityAssetQuery")["resolvers"], AccessControlService = require("../../services")["AccessControlService"], unauthorizedErrorOrAccount = require("../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], getAddressFromEnsOrAddress = require("../../helpers/get-address-from-ens")["getAddressFromEnsOrAddress"], rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Query: {
    findAccountByAddressAndChain: async (e, r, t, o) => {
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
      t = await getAddressFromEnsOrAddress(r.address), o = await Account.findByAddressAndChainId({
        address: t,
        chainId: r.chainId
      });
      return o?.deleted ? null : o;
    },
    findAccountByFarcasterUsername: async (e, r, t, o) => {
      var i = new FarcasterServiceV2(), e = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: o
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      t = await i.getProfileByUsername(r.username);
      return t ? Account.findByAddressAndChainId({
        address: t.address,
        chainId: 1
      }) : null;
    },
    getCurrentAccount: async (e, r, t, o) => {
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
      return o.account || null;
    },
    getCurrentAccountAvailableRoles: async (e, r, t, o) => {
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
      return AccountService.refreshRoles(o.account, {
        commnumunityId: r.communityId
      });
    },
    getThread: async (e, r, t, o) => {
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
      return (await unauthorizedErrorOrAccount(e, r, t)).account && await AccessControlService.accountThreadByThreadIdControl(e, r, t) ? Thread.findOne({
        _id: r.threadId
      }) : null;
    },
    getPostFeed: async (e, r, t, o) => {
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
      return await PostService.getPostFeed(e, r, t);
    },
    getPost: async (e, r, t, o) => {
      var i = r["id"], e = await rateLimiter({
        root: e,
        args: r,
        context: t,
        info: o
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      return t.dataloaders.posts.load(i);
    },
    getReactionsByPostId: async (e, r, t, o) => {
      const {
        postId: i,
        ...n
      } = r;
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
      return await AccountReaction.findReactionsByPostId(i, n);
    },
    getAccountRelationships: async (e, r = {}, t, o) => {
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
      return await AccountRelationship.getAccountRelationships(r);
    },
    getReactionByAccountAndObjectId: async (e, r = {}, t, o) => {
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
      return o.account ? AccountReaction.findReactionByAccountAndObjectId({
        accountId: o.account._id,
        ...r
      }) : null;
    },
    getAccountNotifications: async (e, r, t, o) => {
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
      return o.account ? Notification.find({
        receiver: o.account._id,
        initiator: {
          $ne: o.account._id
        }
      }).sort("-createdAt").limit(20) : null;
    },
    getCommunities: async (e, r, t, o) => {
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
      return Community.findAndSort(r);
    },
    getCommunityAddressScore: async (e, r, t, o) => {
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
      return new _ScoreService().getCommunityScore({
        address: r.address,
        bebdomain: r.bebdomain
      });
    },
    NotificationQuery: () => NotificationQueryResolvers,
    SearchQuery: () => SearchQueryResolvers,
    CommunityQuery: () => CommunityQueryResolvers,
    RoleQuery: () => RoleQueryResolvers,
    AccountQuery: () => AccountQueryResolvers,
    QuestQuery: () => QuestQueryResolvers,
    CommunityAssetQuery: () => CommunityAssetQueryResolvers,
    CommunityQuestQuery: () => CommunityQuestQueryResolvers,
    ChannelRecipientQuery: () => ChannelRecipientQueryResolvers,
    ChannelQuery: () => ChannelQueryResolvers
  }
};

module.exports = {
  resolvers: resolvers
};
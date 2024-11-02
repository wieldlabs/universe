const getGraphQLRateLimiter = require("graphql-rate-limit")["getGraphQLRateLimiter"], AccountCommunity = require("../../models/AccountCommunity")["AccountCommunity"], Account = require("../../models/Account")["Account"], Channel = require("../../models/Channel")["Channel"], Role = require("../../models/Role")["Role"], _RegistrarService = require("../../services/RegistrarService")["Service"], _CommunityQueryService = require("../../services/queryServices/CommunityQueryService")["Service"], CommunityQueryService = new _CommunityQueryService(), rateLimiter = getGraphQLRateLimiter({
  identifyContext: e => e.id
}), RATE_LIMIT_MAX = 1e4, resolvers = {
  Community: {
    available: async (e, r = {}, i, n) => {
      var t = i.services?.RegistrarService || new _RegistrarService(), a = e.bebdomain || r.bebdomain, e = await rateLimiter({
        root: e,
        args: r,
        context: i,
        info: n
      }, {
        max: RATE_LIMIT_MAX,
        window: "60s"
      });
      if (e) throw new Error(e);
      return t.available(a);
    },
    expiresAt: async (e, r = {}, i, n) => {
      var t = i.services?.RegistrarService || new _RegistrarService(), a = e.bebdomain || r.bebdomain, e = await rateLimiter({
        root: e,
        args: r,
        context: i,
        info: n
      }, {
        max: RATE_LIMIT_MAX,
        window: "60s"
      });
      if (e) throw new Error(e);
      return t.expiresAt(a);
    },
    rentPrice: async (e, r = {}, i, n) => {
      var t = i.services?.RegistrarService || new _RegistrarService(), a = e.bebdomain || r.bebdomain, e = await rateLimiter({
        root: e,
        args: r,
        context: i,
        info: n
      }, {
        max: RATE_LIMIT_MAX,
        window: "60s"
      });
      if (e) throw new Error(e);
      return t.rentPrice({
        bebdomain: a,
        duration: r.duration
      });
    },
    commitment: async (e, r = {}, i, n) => {
      var t = i.services?.RegistrarService || new _RegistrarService(), a = e.bebdomain || r.bebdomain, e = await rateLimiter({
        root: e,
        args: r,
        context: i,
        info: n
      }, {
        max: RATE_LIMIT_MAX,
        window: "60s"
      });
      if (e) throw new Error(e);
      return {
        hash: await t.makeCommitment({
          bebdomain: a,
          address: r.address,
          duration: r.duration
        }),
        secret: t.makeSecret({
          bebdomain: a,
          address: r.address,
          duration: r.duration
        })
      };
    },
    tokenId: async (e, r = {}, i, n) => {
      var t = i.services?.RegistrarService || new _RegistrarService(), a = e.bebdomain || r.bebdomain, e = await rateLimiter({
        root: e,
        args: r,
        context: i,
        info: n
      }, {
        max: RATE_LIMIT_MAX,
        window: "10s"
      });
      if (e) throw new Error(e);
      return t.getTokenIdFromLabel(a);
    },
    image: async (e, r, i) => {
      return e.image ? await i.dataloaders.images.load(e.image) : null;
    },
    bannerImage: async (e, r, i) => {
      return e.bannerImage ? await i.dataloaders.images.load(e.bannerImage) : null;
    },
    membersCount: async e => {
      return e?._id ? await AccountCommunity.find({
        joined: !0,
        community: e._id
      }).count() : 0;
    },
    accountCommunity: async (e, r, i) => CommunityQueryService.accountCommunity(e, r, i),
    tokenOwnerAddress: async (e, r, i, n) => {
      var t = i.services?.RegistrarService || new _RegistrarService(), i = await rateLimiter({
        root: e,
        args: r,
        context: i,
        info: n
      }, {
        max: RATE_LIMIT_MAX,
        window: "60s"
      }), n = e.bebdomain || r.bebdomain, e = e.tld || r.tld || "beb";
      if (i) throw new Error(i);
      return t.getOwner(n, e);
    },
    owner: async e => {
      return e?.owner ? await Account.findById(e.owner) : null;
    },
    members: async (e, r) => {
      return e?._id ? await AccountCommunity.findAndSort({
        ...r,
        filters: {
          joined: !0,
          community: e._id
        }
      }) : [];
    },
    permissions: async e => e?._id && (await e?.populate?.("permissions"), e?.permissions) || [],
    roles: async (e, r = {}) => {
      return e?._id ? await Role.findAndSort({
        communityId: e._id,
        ...r
      }) : [];
    },
    channels: async (e, r = {}) => {
      return e?._id ? await Channel.findAndSort({
        filters: {
          communityId: e._id,
          onlyPublic: !0
        },
        ...r
      }) : [];
    },
    currentAccountPermissions: async (e, r, i) => CommunityQueryService.currentAccountPermissions(e, r, i)
  }
};

module.exports = {
  resolvers: resolvers
};
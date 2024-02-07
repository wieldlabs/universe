const Community = require("../../models/Community")["Community"], ChannelRecipient = require("../../models/ChannelRecipient")["ChannelRecipient"], Image = require("../../models/Image")["Image"], AccountChannel = require("../../models/AccountChannel")["AccountChannel"], _CurrentAccountPermissionService = require("../../services/queryServices/CurrentAccountPermissionService")["Service"], unauthorizedErrorOrAccount = require("../../helpers/auth-middleware")["unauthorizedErrorOrAccount"], resolvers = {
  Channel: {
    community: async e => Community.findById(e.community),
    icon: async e => Image.findById(e.icon),
    recipients: async e => {
      return e?.recipients?.length ? e.recipients?.[0]?.slug ? e.recipients : await ChannelRecipient.find({
        channel: e._id
      }) : [];
    },
    currentAccountChannel: async (e, n, r) => r.accountId ? AccountChannel.findOrCreate({
      accountId: r.accountId,
      channelId: e._id
    }) : null,
    createdBy: async (e, n, r) => {
      return e.createdBy ? await r.dataloaders.accounts.load(e.createdBy) : null;
    },
    lastPost: async (e, n, r) => {
      return e.lastPost ? await r.dataloaders.posts.load(e.lastPost) : null;
    },
    currentAccountPermissions: async (e, n, r) => {
      await unauthorizedErrorOrAccount(e, n, r);
      var n = e?.community, c = e?._id;
      return new _CurrentAccountPermissionService().currentAccountPermissions(e, {
        communityId: n,
        channelId: c
      }, r);
    }
  }
};

module.exports = {
  resolvers: resolvers
};
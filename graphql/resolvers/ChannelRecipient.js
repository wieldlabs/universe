const Channel = require("../../models/Channel")["Channel"], resolvers = {
  ChannelRecipient: {
    channel: async e => Channel.findById(e.channel),
    recipientType: async e => 0 === e.recipientType ? "ACCOUNT" : 1 === e.recipientType ? "ROLE" : null,
    recipient: async (e, n, i) => {
      let t = null, c = null, r = null;
      return 0 === e.recipientType ? (t = "account", c = await i.dataloaders.accounts.load(e.recipientId), 
      r = "ACCOUNT") : 1 === e.recipientType && (t = "role", c = await i.dataloaders.roles.load(e.recipientId), 
      r = "ROLE"), {
        _id: e.recipientId,
        type: r,
        [t]: c
      };
    }
  },
  Recipient: {
    __resolveType(e) {
      switch (e.type) {
       case "ACCOUNT":
        return "AccountRecipientUnion";

       case "ROLE":
        return "RoleRecipientUnion";

       default:
        return "AccountRecipientUnion";
      }
    }
  }
};

module.exports = {
  resolvers: resolvers
};
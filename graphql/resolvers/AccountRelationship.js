const AccountRelationship = require("../../models/AccountRelationship")["AccountRelationship"], resolvers = {
  AccountRelationship: {
    from: async (o, c, n) => n.dataloaders.accounts.load(o.account),
    to: async (o, c, n) => n.dataloaders.accounts.load(o.account),
    connection: async o => o.connection || AccountRelationship.findOne({
      to: o.from?._id || o.from,
      from: o.to?._id || o.to
    })
  }
};

module.exports = {
  resolvers: resolvers
};
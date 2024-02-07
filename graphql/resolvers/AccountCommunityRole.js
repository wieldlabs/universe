const Role = require("../../models/Role")["Role"], AccountCommunity = require("../../models/AccountCommunity")["AccountCommunity"], resolvers = {
  AccountCommunityRole: {
    accountCommunity: async o => AccountCommunity.findById(o.accountCommunity),
    role: async o => Role.findById(o.role)
  }
};

module.exports = {
  resolvers: resolvers
};
const AccountAddress = require("../../models/AccountAddress")["AccountAddress"], resolvers = {
  Score: {
    account: async s => {
      return (await AccountAddress.findOne({
        address: s.address
      }).populate("account")).account;
    }
  }
};

module.exports = {
  resolvers: resolvers
};
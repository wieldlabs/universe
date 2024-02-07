const Account = require("../../models/Account")["Account"], Thread = require("../../models/Thread")["Thread"], resolvers = {
  AccountThread: {
    account: async e => {
      return await Account.findById(e.account);
    },
    thread: async e => {
      return await Thread.findById(e.thread);
    },
    latestMessage: async e => {
      return e.latestMessage || (await Thread.getMessages(e.thread, {
        limit: 1
      }))?.[0] || null;
    }
  }
};

module.exports = {
  resolvers: resolvers
};
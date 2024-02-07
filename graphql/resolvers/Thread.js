const Thread = require("../../models/Thread")["Thread"], AccountThread = require("../../models/AccountThread")["AccountThread"], ThreadTransaction = require("../../models/ThreadTransaction")["ThreadTransaction"], resolvers = {
  ThreadTransaction: {
    thread: async e => {
      return await Thread.findById(e.thread);
    },
    sender: async (e, a, r) => {
      return await r.dataloaders.accounts.load(e.sender);
    },
    recipient: async (e, a, r) => {
      return await r.dataloaders.accounts.load(e.recipient);
    }
  },
  ThreadMessage: {
    thread: async e => {
      return await Thread.findById(e.thread);
    },
    sender: async (e, a, r) => {
      return await r.dataloaders.accounts.load(e.sender);
    }
  },
  Thread: {
    messages: async (e, a) => {
      return await Thread.getMessages(e._id, a);
    },
    transactions: async e => {
      return await ThreadTransaction.find({
        thread: e._id
      });
    },
    recipients: async (e, a, r) => {
      return await Thread.getRecipientsByThreadId({
        threadId: e._id,
        exceptSelfId: r.accountId
      });
    },
    recipientAccountThreads: async (e, a, r) => {
      return await AccountThread.getAccountThreadByThread({
        exceptSelfId: r.accountId,
        threadId: e._id
      });
    }
  }
};

module.exports = {
  resolvers: resolvers
};
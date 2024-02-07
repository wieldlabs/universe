const mongoose = require("mongoose"), AccountThread = require("./AccountThread")["AccountThread"], ThreadTransaction = require("./ThreadTransaction")["ThreadTransaction"], ThreadMessage = require("./ThreadMessage")["ThreadMessage"], Account = require("./Account")["Account"], AccountNonce = require("./AccountNonce")["AccountNonce"], schema = require("../schemas/thread")["schema"];

class ThreadClass {
  static ping() {
    console.log("model: ThreadClass");
  }
  static async _accountExistCheck(e) {
    if (await Account.exists({
      _id: e
    })) return !0;
    throw new Error("Invalid Account");
  }
  static async _existingThreadBetweenAccounts({
    accountIdOne: e,
    accountIdTwo: a
  }) {
    var e = await AccountThread.find({
      account: e
    }), t = e.map(e => e.thread), t = await AccountThread.findOne({
      thread: {
        $in: t
      },
      account: a
    });
    if (t?.thread) {
      const r = await Thread.findById(t?.thread);
      a = e.find(e => e.thread.toString() === r._id.toString());
      return [ r, [ a, t ] ];
    }
    return [];
  }
  static async createThread({
    fromAccountId: e,
    recipientAddress: a,
    recipientChainId: t
  }) {
    await Thread._accountExistCheck(e);
    a = await Account.findOrCreateByAddressAndChainId({
      address: a,
      chainId: t
    });
    if (a._id.toString() === e.toString()) throw new Error("Cannot create a thread with same recipient as sender");
    var t = await Thread._existingThreadBetweenAccounts({
      accountIdOne: e,
      accountIdTwo: a._id
    });
    return t.length ? t : [ t = await Thread.create({}), [ await AccountThread.findOrCreate({
      threadId: t._id,
      accountId: e,
      isAccepted: !0
    }), await AccountThread.findOrCreate({
      threadId: t._id,
      accountId: a._id,
      isAccepted: !1
    }) ] ];
  }
  static async getRecipientsByThreadId({
    threadId: e,
    exceptSelfId: a
  }) {
    e = await AccountThread.getAccountThreadByThread({
      threadId: e,
      exceptSelfId: a
    });
    return await Promise.all(e.map(e => new Promise((t, r) => {
      Account.findById(e.account).exec((e, a) => e ? r(e) : t(a));
    })));
  }
  static async getMessages(e, {
    limit: a = 20,
    offset: t = 0,
    sort: r = "-createdAt"
  } = {}) {
    return ThreadMessage.find({
      thread: e
    }).sort(r).skip(t).limit(a);
  }
  static async createStakedThread({
    recipientAddress: e,
    recipientChainId: a,
    senderId: t,
    nonce: r,
    tokenAmount: c,
    signature: n,
    transactionHash: d
  }) {
    var [ e, a ] = await this.createThread({
      fromAccountId: t,
      recipientAddress: e,
      recipientChainId: a
    }), a = a?.[1]?.account, r = await ThreadTransaction.createNewStake({
      nonce: r,
      tokenAmount: c,
      signature: n,
      transactionHash: d,
      threadId: e._id,
      recipientId: a,
      senderId: t
    });
    return await AccountNonce.generateNewTransactionNonceByAccountId(t), [ e, r ];
  }
}

schema.loadClass(ThreadClass);

const Thread = mongoose.models.Thread || mongoose.model("Thread", schema);

module.exports = {
  Thread: Thread
};
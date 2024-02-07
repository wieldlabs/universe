const mongoose = require("mongoose"), schema = require("../schemas/threadTransaction")["schema"];

class ThreadTransactionClass {
  static ping() {
    console.log("model: ThreadTransactionClass");
  }
  static async createNewStake({
    recipientId: a,
    senderId: n,
    nonce: e,
    tokenAmount: s,
    threadId: o,
    signature: t,
    transactionHash: r
  }) {
    return this.create({
      thread: o,
      signature: t,
      nonce: e,
      tokenAmount: s,
      sender: n,
      recipient: a,
      transactionHash: r
    });
  }
  static async completeTransaction({
    threadTransactionId: a,
    completionTransactionHash: n
  }) {
    a = await this.findById(a);
    if (a) return a.completionTransactionHash = n, a.isCompleted = !0, a.save();
    throw new Error("Invalid Transaction");
  }
}

schema.loadClass(ThreadTransactionClass);

const ThreadTransaction = mongoose.models.ThreadTransaction || mongoose.model("ThreadTransaction", schema);

module.exports = {
  ThreadTransaction: ThreadTransaction
};
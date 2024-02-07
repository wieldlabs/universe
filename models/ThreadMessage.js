const mongoose = require("mongoose"), AccountThread = require("./AccountThread")["AccountThread"], schema = require("../schemas/threadMessage")["schema"], ContentService = require("../services/ContentService")["Service"];

class ThreadMessageClass {
  static ping() {
    console.log("model: ThreadMessageClass");
  }
  static async _verifyThreadAndSender({
    threadId: e,
    senderId: a
  }) {
    if (await AccountThread.exists({
      thread: e,
      account: a
    })) return !0;
    throw new Error("Invalid Thread or Sender");
  }
  static async createForThread({
    threadId: e,
    senderId: a,
    contentRaw: s,
    contentJson: r,
    contentHtml: t,
    blocks: n
  }) {
    await ThreadMessage._verifyThreadAndSender({
      threadId: e,
      senderId: a
    });
    s = await new ContentService().makeRichContent({
      contentRaw: s,
      contentJson: r,
      contentHtml: t,
      blocks: n
    });
    return await ThreadMessage.create({
      richContent: s,
      sender: a,
      thread: e
    });
  }
}

schema.loadClass(ThreadMessageClass);

const ThreadMessage = mongoose.models.ThreadMessage || mongoose.model("ThreadMessage", schema);

module.exports = {
  ThreadMessage: ThreadMessage
};
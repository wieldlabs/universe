const mongoose = require("mongoose"), schema = require("../../schemas/chat/chatThread")["schema"];

class ChatThreadClass {
  static ping() {
    console.log("model: ChatThreadClass");
  }
}

schema.loadClass(ChatThreadClass);

const ChatThread = mongoose.models.ChatThread || mongoose.model("ChatThread", schema);

module.exports = {
  ChatThread: ChatThread
};
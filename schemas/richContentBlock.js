const mongoose = require("mongoose"), schema = mongoose.Schema({
  blockType: {
    type: String,
    enum: [ "IMAGE", "LINK", "RICH_EMBED", "COLLECTION", "QUEST", "POST" ],
    index: !0
  },
  blockId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0
  }
});

module.exports = {
  schema: schema
};
const mongoose = require("mongoose"), contentSchema = require("./content")["schema"], schema = mongoose.Schema({
  type: {
    type: String,
    enum: [ "MESSAGE_REQUEST", "POST_COMMENT", "POST_REACTION", "CONNECTION_REQUEST", "POST_MENTION" ],
    index: !0
  },
  content: contentSchema,
  title: {
    type: String
  },
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0,
    required: !0
  },
  externalUrl: {
    type: String
  },
  image: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image"
  },
  lastSeen: {
    type: Date,
    index: !0
  }
}, {
  timestamps: !0
});

schema.index({
  createdAt: -1
}), schema.index({
  updatedAt: -1
}), module.exports = {
  schema: schema
};
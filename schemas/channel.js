const mongoose = require("mongoose"), contentSchema = require("./content")["schema"], schema = mongoose.Schema({
  description: contentSchema,
  name: {
    type: String,
    required: !0
  },
  slug: {
    type: String,
    index: !0
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Community"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Account"
  },
  icon: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Image"
  },
  permissionsOverwrite: [ {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "PermissionOverwrite"
  } ],
  recipients: [ {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "ChannelRecipient"
  } ],
  lastPost: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Post"
  },
  lastPostCreatedAt: {
    type: Date,
    index: !0
  },
  isHidden: {
    type: Boolean,
    default: !1,
    index: !0
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};
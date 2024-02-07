const mongoose = require("mongoose"), richContentSchema = require("./richContent")["schema"], schema = mongoose.Schema({
  richContent: richContentSchema,
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0,
    required: !0
  },
  externalId: {
    type: String,
    index: !0
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    index: !0
  },
  root: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    index: !0
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
    index: !0
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Channel",
    index: !0
  },
  replies: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    index: !0
  } ],
  isHidden: {
    type: Boolean,
    default: !1,
    index: !0
  }
}, {
  timestamps: !0
});

schema.index({
  createdAt: -1
}), schema.index({
  updatedAt: -1
}), schema.index({
  community: 1,
  createdAt: -1
}), schema.index({
  isHidden: 1,
  parent: 1,
  channel: 1,
  community: 1
}), module.exports = {
  schema: schema
};
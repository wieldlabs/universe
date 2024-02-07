const mongoose = require("mongoose"), contentSchema = require("./content")["schema"], schema = mongoose.Schema({
  description: contentSchema,
  name: {
    type: String,
    required: !0
  },
  slug: {
    type: String,
    required: !0,
    index: !0
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Community"
  },
  icon: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Image"
  },
  editable: {
    type: Boolean,
    default: !1
  },
  color: {
    type: String
  },
  position: {
    type: Number
  },
  isManagedByIndexer: {
    type: Boolean,
    default: !1
  },
  permissionString: {
    type: String
  },
  indexerRules: [ {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "IndexerRule"
  } ],
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
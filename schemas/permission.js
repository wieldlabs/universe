const mongoose = require("mongoose"), contentSchema = require("./content")["schema"], schema = mongoose.Schema({
  description: contentSchema,
  name: {
    type: String,
    required: !0
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    required: !0,
    index: !0,
    ref: "Community"
  },
  uniqueIdentifier: {
    type: String,
    index: !0
  },
  editable: {
    type: Boolean,
    default: !1
  },
  bitwiseFlag: {
    type: String,
    required: !0,
    index: !0
  },
  bitwisePosition: {
    type: Number,
    required: !0,
    index: !0
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};
const mongoose = require("mongoose"), schema = mongoose.Schema({
  useCount: {
    type: Number,
    default: 0
  },
  maxUseCount: {
    type: Number,
    default: -1
  },
  expiresAt: {
    type: Date
  },
  code: {
    type: String,
    required: !0
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};
const mongoose = require("mongoose"), schema = mongoose.Schema({
  tokenId: {
    type: Number,
    default: 0,
    index: !0,
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
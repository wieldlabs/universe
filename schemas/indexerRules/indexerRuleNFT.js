const mongoose = require("mongoose"), schema = mongoose.Schema({
  indexerRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "IndexerRule"
  },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Address"
  },
  tokenId: {
    type: String
  },
  minAmount: {
    type: Number,
    default: 1
  }
});

module.exports = {
  schema: schema
};
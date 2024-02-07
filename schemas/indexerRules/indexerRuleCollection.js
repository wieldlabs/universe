const mongoose = require("mongoose"), schema = mongoose.Schema({
  indexerRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "IndexerRule"
  },
  contractAddress: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Address"
  }
});

module.exports = {
  schema: schema
};
const mongoose = require("mongoose"), schema = mongoose.Schema({
  indexerRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "IndexerRule",
    required: !0
  },
  uri: {
    type: String,
    required: !0
  }
});

module.exports = {
  schema: schema
};
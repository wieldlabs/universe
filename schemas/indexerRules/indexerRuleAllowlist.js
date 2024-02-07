const mongoose = require("mongoose"), chainSchema = require("../chain")["schema"], schema = mongoose.Schema({
  indexerRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "IndexerRule"
  },
  addresses: [ {
    type: String,
    required: !0
  } ],
  chain: chainSchema
});

module.exports = {
  schema: schema
};
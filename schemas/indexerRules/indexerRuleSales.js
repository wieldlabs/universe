const mongoose = require("mongoose"), chainSchema = require("../chain")["schema"], schema = mongoose.Schema({
  indexerRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "IndexerRule"
  },
  fromBlock: {
    type: String
  },
  toBlock: {
    type: String
  },
  fromAddress: {
    type: String
  },
  toAddress: {
    type: String
  },
  contractAddresses: [ {
    type: String
  } ],
  chain: chainSchema,
  category: [ {
    type: String
  } ]
});

module.exports = {
  schema: schema
};
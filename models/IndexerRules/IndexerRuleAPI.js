const mongoose = require("mongoose"), schema = require("../../schemas/indexerRules/indexerRuleAPI")["schema"];

class IndexerRuleAPIClass {
  static ping() {
    console.log("model: IndexerRuleAPIClass");
  }
}

schema.loadClass(IndexerRuleAPIClass);

const IndexerRuleAPI = mongoose.models.IndexerRuleAPI || mongoose.model("IndexerRuleAPI", schema);

module.exports = {
  IndexerRuleAPI: IndexerRuleAPI
};
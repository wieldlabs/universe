const mongoose = require("mongoose"), schema = require("../../schemas/indexerRules/indexerRuleCollection")["schema"];

class IndexerRuleCollectionClass {
  static ping() {
    console.log("model: IndexerRuleCollectionClass");
  }
}

schema.loadClass(IndexerRuleCollectionClass);

const IndexerRuleCollection = mongoose.models.IndexerRuleCollection || mongoose.model("IndexerRuleCollection", schema);

module.exports = {
  IndexerRuleCollection: IndexerRuleCollection
};
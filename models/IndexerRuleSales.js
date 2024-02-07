const mongoose = require("mongoose"), schema = require("../schemas/indexerRules/indexerRuleSales")["schema"];

class IndexerRuleSalesClass {
  static ping() {
    console.log("model: IndexerRuleSalesClass");
  }
}

schema.loadClass(IndexerRuleSalesClass);

const IndexerRuleSales = mongoose.models.IndexerRuleSales || mongoose.model("IndexerRuleSales", schema);

module.exports = {
  IndexerRuleSales: IndexerRuleSales
};
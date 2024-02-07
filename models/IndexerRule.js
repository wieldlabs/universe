const mongoose = require("mongoose"), pick = require("lodash/pick"), schema = require("../schemas/indexerRule")["schema"];

class IndexerRuleClass {
  static ping() {
    console.log("model: IndexerRuleClass");
  }
  async edit(e) {
    e = pick(e, [ "indexerRuleType", "ruleDataId" ]);
    return void 0 !== e.indexerRuleType && (this.indexerRuleType = e.indexerRuleType), 
    void 0 !== e.ruleDataId && (this.ruleDataId = e.ruleDataId), this.save();
  }
}

schema.loadClass(IndexerRuleClass);

const IndexerRule = mongoose.models.IndexerRule || mongoose.model("IndexerRule", schema);

module.exports = {
  IndexerRule: IndexerRule
};
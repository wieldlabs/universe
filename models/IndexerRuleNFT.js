const mongoose = require("mongoose"), schema = require("../schemas/indexerRules/indexerRuleNFT")["schema"];

class IndexerRuleNFTClass {
  static ping() {
    console.log("model: IndexerRuleNFTClass");
  }
  static async create({
    indexerRuleId: e,
    addressId: s,
    tokenId: n,
    minAmount: o
  }) {
    if (s && e) return await (s = new IndexerRuleNFT({
      address: new mongoose.Types.ObjectId(s),
      tokenId: n,
      minAmount: o,
      indexerRuleId: e
    })).save(), s;
    throw new Error("Missing required parameters");
  }
}

schema.loadClass(IndexerRuleNFTClass);

const IndexerRuleNFT = mongoose.models.IndexerRuleNFT || mongoose.model("IndexerRuleNFT", schema);

module.exports = {
  IndexerRuleNFT: IndexerRuleNFT
};
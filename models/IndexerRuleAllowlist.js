const mongoose = require("mongoose"), schema = require("../schemas/indexerRules/indexerRuleAllowlist")["schema"], validateAndConvertAddress = require("../helpers/validate-and-convert-address")["validateAndConvertAddress"], mapChainIdToName = require("../helpers/chain")["mapChainIdToName"];

class IndexerRuleAllowlistClass {
  static ping() {
    console.log("model: IndexerRuleAllowlistClass");
  }
  static async create({
    indexerRuleId: e,
    addresses: l,
    chainId: s
  }, a = 1e5) {
    if (!s || !l || !l.length) throw new Error("Missing required parameters");
    if (l.length > a) throw new Error(`Too many addresses in the allowlist: ${l.length} > ` + a);
    a = (await Promise.allSettled(l.map(e => validateAndConvertAddress(e)))).filter(({
      status: e
    }) => "fulfilled" === e).map(({
      value: e
    }) => e), l = new IndexerRuleAllowlist({
      addresses: a,
      chain: {
        chainId: s,
        name: mapChainIdToName(s)
      },
      indexerRuleId: e
    });
    return await l.save(), l;
  }
}

schema.loadClass(IndexerRuleAllowlistClass);

const IndexerRuleAllowlist = mongoose.models.IndexerRuleAllowlist || mongoose.model("IndexerRuleAllowlist", schema);

module.exports = {
  IndexerRuleAllowlist: IndexerRuleAllowlist
};
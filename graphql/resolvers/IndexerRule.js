const Community = require("../../models/Community")["Community"], Address = require("../../models/Address")["Address"], IndexerRule = require("../../models/IndexerRule")["IndexerRule"], IndexerRuleService = require("../../services")["IndexerRuleService"], resolvers = {
  IndexerRuleAllowlist: {
    indexerRule: async e => IndexerRule.findById(e.indexerRuleId),
    addresses: async (e, r = {
      limit: 1e3,
      offset: 0
    }) => {
      var d = r.offset * r.limit, r = d + r.limit;
      return e?.addresses?.slice?.(d, r);
    }
  },
  IndexerRuleNFT: {
    indexerRule: async e => IndexerRule.findById(e.indexerRuleId),
    address: async e => Address.findById(e.address)
  },
  IndexerRuleAPI: {
    indexerRule: async e => IndexerRule.findById(e.indexerRuleId)
  },
  IndexerRuleData: {
    __resolveType(e) {
      switch (e.indexerRuleType) {
       case "NFT":
        return "IndexerRuleNFTUnion";

       case "ALLOWLIST":
        return "IndexerRuleAllowlistUnion";

       case "API":
        return "IndexerRuleAPIUnion";

       default:
        return "IndexerRuleNFTUnion";
      }
    }
  },
  IndexerRule: {
    community: async e => Community.findById(e.community),
    ruleOwnerType: async e => IndexerRuleService.getRuleOwnerType(e),
    ruleData: async e => {
      var r = await IndexerRuleService.getRuleData(e);
      return "NFT" === e.indexerRuleType ? {
        _id: e.ruleDataId,
        indexerRuleType: e.indexerRuleType,
        indexerRuleNFTData: r
      } : "ALLOWLIST" === e.indexerRuleType ? {
        _id: e.ruleDataId,
        indexerRuleType: e.indexerRuleType,
        indexerRuleAllowlistData: r
      } : "API" === e.indexerRuleType ? {
        _id: e.ruleDataId,
        indexerRuleType: e.indexerRuleType,
        indexerRuleAPIData: r
      } : null;
    }
  }
};

module.exports = {
  resolvers: resolvers
};
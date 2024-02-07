const IndexerRule = require("../../models/IndexerRule")["IndexerRule"], _CommunityService = require("../CommunityService")["Service"], IndexerRuleService = require("../IndexerRuleService")["Service"];

class IndexerRuleMutationService extends IndexerRuleService {
  async _canEditRuleOwnerOrError(e) {
    if (!e) throw new Error("Invalid indexer Rule");
    if ("ROLE" === !this.getRuleOwnerType(e)) return !0;
    if ((await this.getRuleOwner(e))?.editable) return !0;
    throw new Error("You do not have permission to edit the role.");
  }
  async _canAdminRoleCommunityOrError(e, r, i) {
    if (!e) throw new Error("Invalid indexer Rule");
    var n = new _CommunityService(), n = (await e.populate("community"), await n.canAdmin(e.community, r, i));
    if (n) return !0;
    throw new Error("You do not have permission to edit the role.");
  }
  async editIndexerRuleOrUnauthorized(e, {
    indexerRuleId: r,
    ruleDataInput: i
  }, n) {
    var t = await IndexerRule.findById(r), r = (await this._canAdminRoleCommunityOrError(t, {
      indexerRuleId: r
    }, n), await this._canEditRuleOwnerOrError(t), i.indexerRuleType);
    let u;
    switch (r) {
     case "NFT":
      u = i.indexerRuleNFTInput;
      break;

     case "ALLOWLIST":
      u = i.indexerRuleAllowlistInput;
      break;

     case "API":
      u = i.indexerRuleAPIInput;
      break;

     default:
      u = null;
    }
    return this.editRule(t, {
      indexerRuleType: r,
      ruleData: u
    }, n);
  }
}

module.exports = {
  Service: IndexerRuleMutationService
};
const Sentry = require("@sentry/node"), IndexerRoleRuleService = require("./indexer/IndexerRoleRuleService")["Service"], IndexerRule = require("../models/IndexerRule")["IndexerRule"], Address = require("../models/Address")["Address"], Role = require("../models/Role")["Role"], Channel = require("../models/Channel")["Channel"], RichBlock = require("../models/RichBlocks/RichBlock")["RichBlock"], IndexerRuleNFT = require("../models/IndexerRuleNFT")["IndexerRuleNFT"], IndexerRuleAPI = require("../models/IndexerRules/IndexerRuleAPI")["IndexerRuleAPI"], IndexerRuleSales = require("../models/IndexerRuleSales")["IndexerRuleSales"], IndexerRuleAllowlist = require("../models/IndexerRuleAllowlist")["IndexerRuleAllowlist"], IndexerRuleCollection = require("../models/IndexerRules/IndexerRuleCollection")["IndexerRuleCollection"];

class IndexerRuleService extends IndexerRoleRuleService {
  get _validRuleOwnerTypes() {
    return [ 0, 1, 2 ];
  }
  get _validChannelRuleTypes() {
    return [ "SALES" ];
  }
  get _validRichBlockRuleTypes() {
    return [ "COLLECTION", "NFT", "PUBLIC", "ALLOWLIST", "FARCASTER", "API" ];
  }
  get _validRoleRuleTypes() {
    return [ "NFT", "PUBLIC", "ALLOWLIST", "FARCASTER", "API" ];
  }
  async _beforeCreateRuleCheck({
    communityId: e,
    ruleOwnerType: r,
    ruleOwnerId: l,
    indexerRuleType: n
  }) {
    if (!e || !l || !n) throw new Error("Missing required parameters");
    if (!this._validRuleOwnerTypes.includes(r)) throw new Error("Only role(0), channel(1) and rich blocks(2) are supported");
    if (await IndexerRule.exists({
      communityId: e,
      ruleOwnerType: r,
      ruleOwnerId: l
    })) throw new Error("An existing rule exists for this ruleOwnerType and ruleOwnerId");
    switch (r) {
     case 0:
      if (this._validRoleRuleTypes.includes(n)) break;
      throw new Error("Invalid indexerRuleType for role(0): " + n);

     case 1:
      if (this._validChannelRuleTypes.includes(n)) break;
      throw new Error("Invalid indexerRuleType for channel(1): " + n);

     case 2:
      if (this._validRichBlockRuleTypes.includes(n)) break;
      throw new Error("Invalid indexerRuleType for rich blcoks(2): " + n);
    }
    switch (r) {
     case 0:
      if (await Role.exists({
        _id: l
      })) break;
      throw new Error("Role does not exist");

     case 1:
      if (await Channel.exists({
        _id: l
      })) break;
      throw new Error("Channel does not exist");
    }
    return !0;
  }
  async createCollectionRule(e, {
    contractAddress: r,
    chainId: l
  }) {
    r = await Address.findOrCreate({
      address: r,
      chainId: l
    });
    return await IndexerRuleCollection.create({
      contractAddress: r._id,
      indexerRuleId: e
    });
  }
  async createAllowlistRule(e, {
    chainId: r,
    addresses: l
  }) {
    return await IndexerRuleAllowlist.create({
      addresses: l,
      chainId: r,
      indexerRuleId: e
    });
  }
  async createNFTRule(e, r = {}) {
    var {
      address: r,
      chainId: l,
      tokenId: n,
      minAmount: a
    } = r;
    if (r && e) return r = await Address.findOrCreate({
      address: r,
      chainId: l
    }), await IndexerRuleNFT.create({
      addressId: r._id,
      tokenId: n,
      minAmount: a,
      indexerRuleId: e
    });
    throw new Error("Missing required parameters");
  }
  async createAPIrule(e, r = {}) {
    r = r.uri;
    return await IndexerRuleAPI.create({
      uri: r,
      indexerRuleId: e
    });
  }
  async createRuleData({
    indexerRuleType: r,
    indexerRuleId: l,
    ruleData: n
  }) {
    try {
      let e = null;
      switch (r) {
       case "NFT":
        e = await this.createNFTRule(l, n);
        break;

       case "ALLOWLIST":
        e = await this.createAllowlistRule(l, n);
        break;

       case "API":
        e = await this.createAPIrule(l, n);
        break;

       case "SALES":
        break;

       case "COLLECTION":
        e = await this.createCollectionRule(l, n);
      }
      return e;
    } catch (e) {
      throw Sentry.captureException(e, "IndexerRuleService.createRuleData"), new Error(e.message);
    }
  }
  async createRuleWithData({
    indexerRuleType: e,
    ruleData: r = {},
    communityId: l,
    ruleOwnerType: n,
    ruleOwnerId: a
  }) {
    await this._beforeCreateRuleCheck({
      communityId: l,
      ruleOwnerType: n,
      ruleOwnerId: a,
      indexerRuleType: e
    });
    try {
      var t = new IndexerRule({
        community: l,
        ruleOwnerType: n,
        ruleOwnerId: a,
        indexerRuleType: e
      }), u = await this.createRuleData({
        indexerRuleType: e,
        indexerRuleId: t._id,
        ruleData: r
      });
      return t.ruleDataId = u?._id, await t.save(), [ t, u ];
    } catch (e) {
      throw Sentry.captureException(e, "IndexerRuleService.createRuleWithData"), 
      new Error("Error creating rule: " + e.message);
    }
  }
  async getRuleData(e) {
    if (!e) return null;
    switch (e.indexerRuleType) {
     case "NFT":
      return IndexerRuleNFT.findById(e.ruleDataId);

     case "SALES":
      return IndexerRuleSales.findById(e.ruleDataId);

     case "ALLOWLIST":
      return IndexerRuleAllowlist.findById(e.ruleDataId);

     case "COLLECTION":
      return IndexerRuleCollection.findById(e.ruleDataId);

     case "API":
      return IndexerRuleAPI.findById(e.ruleDataId);

     default:
      return null;
    }
  }
  async getRuleOwner(e) {
    if (!e) return null;
    switch (e.ruleOwnerType) {
     case 0:
      return Role.findById(e.ruleOwnerId);

     case 1:
      return Channel.findById(e.ruleOwnerId);

     case 2:
      return RichBlock.findById(e.ruleOwnerId);

     default:
      return null;
    }
  }
  async editRule(e, {
    indexerRuleType: r,
    ruleData: l = {}
  }) {
    if (!e) return null;
    await this.deleteRuleData(e);
    l = await this.createRuleData({
      indexerRuleType: r,
      indexerRuleId: e._id,
      ruleData: l
    });
    return await e.edit({
      ruleDataId: l?._id,
      indexerRuleType: r
    });
  }
  async deleteRule(e) {
    var r;
    return e ? ((r = await IndexerRule.findById(e)) && (await r.remove(), await this.deleteRuleData(r)), 
    e) : null;
  }
  async deleteRuleData(e) {
    var r = await this.getRuleData(e);
    return e && r ? (await r.remove(), r._id) : null;
  }
  getRuleOwnerType(e) {
    if (!e) return null;
    switch (e.ruleOwnerType) {
     case 0:
      return "ROLE";

     case 1:
      return "CHANNEL";

     case 2:
      return "RICH_BLOCK";

     default:
      return null;
    }
  }
}

module.exports = {
  Service: IndexerRuleService
};
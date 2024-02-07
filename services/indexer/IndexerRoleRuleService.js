const axios = require("axios").default, IndexerRuleAllowlist = require("../../models/IndexerRuleAllowlist")["IndexerRuleAllowlist"], IndexerRuleNFT = require("../../models/IndexerRuleNFT")["IndexerRuleNFT"], IndexerRuleAPI = require("../../models/IndexerRules/IndexerRuleAPI")["IndexerRuleAPI"], _AlchemyService = require("../../services/AlchemyService")["Service"], getFarcasterUserByConnectedAddress = require("../../helpers/farcaster")["getFarcasterUserByConnectedAddress"], AlchemyServiceMainnet = new _AlchemyService({
  apiKey: process.env.HOMESTEAD_NODE_URL
});

class IndexerRoleRuleService {
  async _canClaimNFTRole(e, {
    data: r = {}
  }) {
    r = r.address;
    if (!r) return !1;
    e = await IndexerRuleNFT.findById(e?.ruleDataId).populate("address");
    if (e) return await AlchemyServiceMainnet.verifyOwnership({
      address: r,
      contractAddresses: [ e.address.address ]
    });
    throw new Error("Invalid indexerRule");
  }
  async _canClaimAllowlistRole(e, {
    data: r = {}
  }) {
    const a = r["address"];
    if (!a) return !1;
    r = await IndexerRuleAllowlist.findById(e?.ruleDataId);
    if (r) return !!r.addresses.find(e => e.toLowerCase() === a?.toLowerCase());
    throw new Error("Invalid indexerRule");
  }
  async _canClaimAPIRole(e, {
    data: r = {}
  }) {
    if (!r?.address) return !1;
    e = await IndexerRuleAPI.findById(e?.ruleDataId);
    if (!e) throw new Error("Invalid indexerRule");
    try {
      var a = (await axios.get(e.uri, {
        params: {
          address: r.address
        },
        timeout: 5e3
      }))["data"];
      return !!a?.success;
    } catch (e) {
      return !1;
    }
  }
  async _canClaimFarcasterRole(e, {
    data: r = {}
  }) {
    try {
      return !!await getFarcasterUserByConnectedAddress(r.address);
    } catch (e) {
      return !1;
    }
  }
  async canClaimRole(e, {
    data: r
  }) {
    if (!e) throw new Error("Invalid parameters");
    switch (e.indexerRuleType) {
     case "NFT":
      return this._canClaimNFTRole(e, {
        data: r
      });

     case "ALLOWLIST":
      return this._canClaimAllowlistRole(e, {
        data: r
      });

     case "FARCASTER":
      return this._canClaimFarcasterRole(e, {
        data: r
      });

     case "API":
      return this._canClaimAPIRole(e, {
        data: r
      });

     case "PUBLIC":
      return !0;

     default:
      return !1;
    }
  }
}

module.exports = {
  Service: IndexerRoleRuleService
};
const axios = require("axios").default, Sentry = require("@sentry/node"), TIMEOUT_MS = 1e4, constants = require("./constants/aa"), WalletService = require("./WalletService")["Service"], _CacheService = require("./cache/CacheService")["Service"], _AccountQueryService = require("./queryServices/AccountQueryService")["Service"], Account = require("../models/Account")["Account"], AccountNonce = require("../models/AccountNonce")["AccountNonce"];

class PaymasterService extends WalletService {
  constructor({
    apiKey: e,
    chain: a = "opt-goerli",
    chainId: t = 420
  }) {
    super({
      apiKey: e,
      chain: a,
      chainId: t
    }), this.apiKey = e, this.chain = a, this.chainId = t, "homestead" === this.chain && (this.chain = "mainnet");
  }
  getBaseRoute() {
    return `https://${this.chain}.g.alchemy.com/v2/` + this.apiKey;
  }
  getNFTBaseRoute() {
    return `https://${this.chain}.g.alchemy.com/nft/v2/` + this.apiKey;
  }
  async _getPaymasterAndData({
    policyId: e = constants.defaultPaymasterPolicyId,
    entryPoint: a = constants.entryPointAddress,
    dummySignature: t = constants.defaultPaymasterDummySignature,
    userOperation: r,
    id: n = 1
  }) {
    var s = "" + this.getBaseRoute();
    try {
      var c = await axios.post(s, {
        id: n,
        jsonrpc: "2.0",
        method: "alchemy_requestGasAndPaymasterAndData",
        params: [ {
          policyId: e,
          entryPoint: a,
          dummySignature: t,
          userOperation: r
        } ]
      }, {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: TIMEOUT_MS
      });
      if (c?.data?.error) throw Sentry.captureException(JSON.stringify(c?.data?.error)), 
      new Error(JSON.stringify(c?.data?.error));
      return c?.data.result;
    } catch (e) {
      throw console.log("error", e.response?.data?.error), Sentry.captureException(e), 
      e;
    }
  }
  async _cachedOrGetPaymasterData({
    userOperation: e,
    ...a
  }) {
    var t = new _CacheService(), r = await t.get({
      key: "PaymasterService",
      params: {
        userOperation: e
      }
    });
    return r || (r = await this._getPaymasterAndData({
      userOperation: e,
      ...a
    }), t.set({
      key: "PaymasterService",
      params: {
        userOperation: e
      },
      expiresAt: Date.now() + 12e4,
      value: r
    }), r);
  }
  async _handleCreateBackpackPaymaster({
    id: e = 1,
    userOp: a = {},
    accountId: t,
    backpackAddress: r
  }) {
    if (r) return t = (await AccountNonce.findOne({
      account: t
    })).salt, r = {
      sender: r,
      nonce: "0x0",
      initCode: this.getInitCode({
        ownerAddress: a.sender,
        salt: t
      }),
      callData: "0x"
    }, {
      ...await this._cachedOrGetPaymasterData({
        userOperation: r,
        id: e
      }),
      ...r
    };
    throw new Error("No backpack address found");
  }
  async _handleSponsoredItemPaymaster({
    id: e = 1,
    params: a = [],
    backpackAddress: t
  }) {
    var r = constants.bebOnboardingLootContractAddress, r = this.getCallData({
      abi: constants.LootContractJson.abi,
      functionName: "mint",
      contractAddress: r,
      params: a
    }), a = {
      sender: t,
      nonce: (await this.getBackpackNonce(t)).toHexString(),
      initCode: "0x",
      callData: r
    };
    return {
      ...await this._cachedOrGetPaymasterData({
        userOperation: a,
        id: e
      }),
      ...a
    };
  }
  async handlePaymaster({
    userOp: e,
    type: a,
    params: t = ""
  }) {
    if (!e.sender) throw new Error("No sender found");
    var r, n = await Account.findOrCreateByAddressAndChainId({
      address: e.sender,
      chainId: 1
    }), s = await new _AccountQueryService().backpackAddress(n);
    try {
      if ("CREATE_BACKPACK" === a) return this._handleCreateBackpackPaymaster({
        userOp: e,
        backpackAddress: s,
        accountId: n?._id
      });
      if ("SPONSORED_ITEM" === a) return r = t.split(",") || [], this._handleSponsoredItemPaymaster({
        userOp: e,
        backpackAddress: s,
        params: r
      });
      throw new Error("Invalid type");
    } catch (e) {
      throw Sentry.captureException(e), e;
    }
  }
}

module.exports = {
  Service: PaymasterService
};
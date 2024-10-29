const axios = require("axios").default, Sentry = require("@sentry/node"), TIMEOUT_MS = 15e3;

class AlchemyService {
  constructor({
    apiKey: e,
    chain: r = "eth-mainnet"
  }) {
    this.apiKey = e, this.chain = r, "homestead" != this.chain && "mainnet" != this.chain || (this.chain = "eth-mainnet"), 
    "rinkeby" !== this.chain && "ropsten" !== this.chain && "goerli" !== this.chain || (this.chain = "eth-" + this.chain);
  }
  getBaseRoute() {
    return `https://${this.chain}.g.alchemy.com/v2/` + this.apiKey;
  }
  getNFTBaseRoute() {
    return `https://${this.chain}.g.alchemy.com/nft/v2/` + this.apiKey;
  }
  getNftV3BaseRoute() {
    return `https://${this.chain}.g.alchemy.com/nft/v3/` + this.apiKey;
  }
  async getTransactionCount(e, r = "latest") {
    var t = {
      timeout: TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    }, e = {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionCount",
      params: [ e, r ]
    }, r = this.getBaseRoute();
    try {
      var a = (await axios.post(r, e, t))["data"];
      if (a.error) throw Sentry.captureException("AlchemyService.getTransactionCount error: " + a.error.message), 
      new Error("AlchemyService.getTransactionCount error: " + a.error.message);
      return parseInt(a.result, 16);
    } catch (e) {
      throw console.error(e), Sentry.captureException(e), new Error("AlchemyService.getTransactionCount error: " + e.message);
    }
  }
  async getBalance(e, r = "latest") {
    var t = {
      timeout: TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    }, e = {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [ e, r ]
    }, r = this.getBaseRoute();
    try {
      var a = (await axios.post(r, e, t))["data"];
      if (a.error) throw Sentry.captureException("AlchemyService.getBalance error: " + a.error.message), 
      new Error("AlchemyService.getBalance error: " + a.error.message);
      return a.result;
    } catch (e) {
      throw Sentry.captureException(e), new Error("AlchemyService.getBalance error, " + e.message);
    }
  }
  async getNFTMetadata({
    contractAddress: e,
    tokenId: r,
    tokenType: t
  }) {
    var a = {
      timeout: TIMEOUT_MS
    }, o = this.getNFTBaseRoute() + "/getNFTMetadata", e = {
      contractAddress: e,
      tokenId: r
    };
    t && (e.tokenType = t);
    try {
      var s = (await axios.get(o, {
        params: e,
        ...a
      }))["data"];
      return s;
    } catch (e) {
      throw Sentry.captureException(e), new Error("AlchemyService.getNFTMetadata error, " + e.message);
    }
  }
  async getNFTs({
    owner: e,
    pageKey: r,
    contractAddresses: t,
    withMetadata: a,
    filters: o
  }) {
    var s = {
      timeout: TIMEOUT_MS
    }, c = this.getNFTBaseRoute() + "/getNFTs";
    const n = new URLSearchParams();
    e && n.append("owner", e), r && n.append("pageKey", r), a && n.append("withMetadata", a), 
    t && t.length && t.forEach(e => {
      n.append("contractAddresses[]", e);
    }), o && o.length && o.forEach(e => {
      n.append("filters", e);
    });
    try {
      var i = (await axios.get(c, {
        params: n,
        ...s
      }))["data"];
      return i;
    } catch (e) {
      throw Sentry.captureException(e), new Error("AlchemyService.getNFTMetadata error, " + e.message);
    }
  }
  async getNFTsV3({
    owner: e,
    pageKey: r,
    contractAddresses: t,
    withMetadata: a
  }) {
    var o = {
      timeout: TIMEOUT_MS
    }, s = this.getNftV3BaseRoute() + "/getNFTsForOwner";
    const c = new URLSearchParams();
    e && c.append("owner", e), r && c.append("pageKey", r), a && c.append("withMetadata", a), 
    t && t.length && t.forEach(e => {
      c.append("contractAddresses[]", e);
    });
    try {
      var n = (await axios.get(s, {
        params: c,
        ...o
      }))["data"];
      return n;
    } catch (e) {
      throw Sentry.captureException(e), new Error("AlchemyService.getNFTsV3 error, " + e.message);
    }
  }
  async isHolderOfCollection({
    wallet: e,
    contractAddress: r
  }) {
    var t = {
      timeout: TIMEOUT_MS
    }, a = this.getNFTBaseRoute() + "/isHolderOfCollection", o = new URLSearchParams();
    e && o.append("wallet", e), r && o.append("contractAddress", r);
    try {
      var s = (await axios.get(a, {
        params: o,
        ...t
      }))["data"];
      return !!s?.isHolderOfCollection;
    } catch (e) {
      return console.error(e), Sentry.captureException(e), !1;
    }
  }
  async getOwnersForToken({
    contractAddress: e,
    tokenId: r
  }) {
    var t = {
      timeout: TIMEOUT_MS
    }, a = this.getNFTBaseRoute() + "/getOwnersForToken", e = {
      contractAddress: e,
      tokenId: r
    };
    try {
      var o = (await axios.get(a, {
        params: e,
        ...t
      }))["data"];
      return o;
    } catch (e) {
      throw Sentry.captureException(e), new Error("AlchemyService.getOwnersForToken error, " + e.message);
    }
  }
  async getOwnersForCollection({
    contractAddress: e,
    withTokenBalances: r
  }) {
    var a = {
      timeout: TIMEOUT_MS
    }, o = this.getNFTBaseRoute() + "/getOwnersForCollection" + (r ? "?withTokenBalances=true" : ""), s = {
      contractAddress: e
    };
    try {
      let e = [], r = null, t = 0;
      do {
        var c = (await axios.get(o + (r ? "&pageKey=" + r : ""), {
          params: s,
          ...a
        }))["data"];
        e = [ ...e, ...c.ownerAddresses ], r = c.pageKey, t += 1;
      } while (r && t < 50);
      return {
        ownerAddresses: e
      };
    } catch (e) {
      throw Sentry.captureException(e), new Error("AlchemyService.getOwnersForCollection error, " + e.message);
    }
  }
  async getCollectionFloor({
    contractAddress: e
  }) {
    var r = {
      timeout: TIMEOUT_MS
    }, t = this.getNFTBaseRoute() + "/getFloorPrice", e = {
      contractAddress: e
    };
    try {
      var a = (await axios.get(t, {
        params: e,
        ...r
      }))["data"];
      if (a.error) throw Sentry.captureException("AlchemyService.getCollectionFloor error: " + a.error.message), 
      new Error("AlchemyService.getCollectionFloor error: " + a.error.message);
      return a;
    } catch (e) {
      throw console.error(e), Sentry.captureException(e), new Error("AlchemyService.getCollectionFloor error, " + e.message);
    }
  }
  async verifyOwnership({
    contractAddresses: r,
    address: t,
    count: a = 1,
    attributeType: o,
    attributeValue: s,
    returnCount: c = !1
  }) {
    if (!t || !r) return !!c && 0;
    try {
      var n, i = await this.getNFTs({
        owner: t,
        contractAddresses: r.length ? r : [ r ]
      });
      let e = i?.totalCount || 0;
      return (o && s && (n = i?.ownedNfts?.filter(e => {
        e = (e?.metadata?.attributes)?.find(e => e.trait_type === o);
        return !!e && e?.value?.toLowerCase().includes(s.toLowerCase());
      }), e = n?.length), c) ? e : e >= a;
    } catch (e) {
      return Sentry.captureException(e, "AlchemyService.getOwnersForToken"), !1;
    }
  }
  async getTransactionByHash({
    hash: e,
    id: r
  }) {
    var t = {
      timeout: TIMEOUT_MS
    }, a = "" + this.getBaseRoute(), e = {
      jsonrpc: "2.0",
      id: r,
      method: "eth_getTransactionByHash",
      params: [ e ]
    };
    try {
      var o = (await axios.post(a, e, t))["data"];
      if (o.error) throw Sentry.captureException(`AlchemyService.getTransactionByHash error for id: ${o.id}, ` + o.error.message), 
      new Error(`AlchemyService.getTransactionByHash error for id: ${o.id}, ` + o.error.message);
      return o;
    } catch (e) {
      throw Sentry.captureException(e), new Error(`AlchemyService.getTransactionByHash error for id: ${r}, ` + e.message);
    }
  }
  async getBlockByHash({
    hash: e,
    id: r,
    showFullTransaction: t = !1
  }) {
    var a = {
      timeout: TIMEOUT_MS
    }, o = "" + this.getBaseRoute(), e = {
      jsonrpc: "2.0",
      id: r,
      method: "eth_getBlockByHash",
      params: [ e, t ]
    };
    try {
      var s = (await axios.post(o, e, a))["data"];
      if (s.error) throw Sentry.captureException(`AlchemyService.getBlockByHash error for id: ${s.id}, ` + s.error.message), 
      new Error(`AlchemyService.getBlockByHash error for id: ${s.id}, ` + s.error.message);
      return s;
    } catch (e) {
      throw Sentry.captureException(e), new Error(`AlchemyService.getBlockByHash error for id: ${r}, ` + e.message);
    }
  }
  async getBlockByNumber({
    blockNum: e,
    id: r,
    showFullTransaction: t = !1
  }) {
    var a = {
      timeout: TIMEOUT_MS
    }, o = "" + this.getBaseRoute(), e = {
      jsonrpc: "2.0",
      id: r,
      method: "eth_getBlockByNumber",
      params: [ e, t ]
    };
    try {
      var s = (await axios.post(o, e, a))["data"];
      if (s.error) throw Sentry.captureException(`AlchemyService.getBlockByNumber error for id: ${s.id}, ` + s.error.message), 
      new Error(`AlchemyService.getBlockByNumber error for id: ${s.id}, ` + s.error.message);
      return s;
    } catch (e) {
      throw Sentry.captureException(e), new Error(`AlchemyService.getBlockByNumber error for id: ${r}, ` + e.message);
    }
  }
  async getAssetTransfers({
    fromBlock: e = "0x0",
    toBlock: r = "latest",
    fromAddress: t,
    toAddress: a,
    category: o,
    contractAddresses: s,
    id: c,
    pageKey: n,
    maxCount: i
  }) {
    var h = {
      timeout: TIMEOUT_MS
    }, e = {
      fromBlock: e,
      toBlock: r
    }, r = (t && (e.fromAddress = t), a && (e.toAddress = a), o && (e.category = o), 
    s && (e.contractAddresses = s), n && (e.pageKey = n), i && (e.maxCount = i), 
    {
      jsonrpc: "2.0",
      id: c,
      method: "alchemy_getAssetTransfers",
      params: [ e ]
    });
    try {
      var d = (await axios.post(this.getBaseRoute(), r, h))["data"];
      if (d.error) throw Sentry.captureException(`AlchemyService.getAssetTransfers error for id: ${d.id}, ` + d.error.message), 
      new Error(`AlchemyService.getAssetTransfers error for id: ${d.id}, ` + d.error.message);
      return d;
    } catch (e) {
      throw Sentry.captureException(e), new Error(`AlchemyService.getAssetTransfers error for id: ${c}, ` + e.message);
    }
  }
}

module.exports = {
  Service: AlchemyService
};
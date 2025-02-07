const axios = require("axios").default, Sentry = require("@sentry/node"), pRetry = require("p-retry"), TIMEOUT_MS = 3e4, {
  getTokenIdFromLabel,
  convertHexTokenIdToNumber
} = require("../helpers/get-token-id-from-label"), prod = require("../helpers/registrar")["prod"];

class OpenseaService {
  constructor({
    apiKey: e,
    baseUrl: r = "https://api.opensea.io/api/v2"
  }) {
    this.apiKey = e, this.baseUrl = r;
  }
  getHeaders() {
    return {
      "X-API-KEY": this.apiKey
    };
  }
  async getCollectionByContract(e) {
    var r = {
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS
    };
    try {
      var t = (await axios.get(this.baseUrl + "/asset_contract/" + e, r))["data"];
      return t;
    } catch (e) {
      throw Sentry.captureException(e), new Error("Opensea API error: unable to fetch NFTs");
    }
  }
  async getCollectionBySlug(e) {
    var r = {
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS
    };
    try {
      var t = (await axios.get(this.baseUrl + "/collection/" + e, r))["data"];
      return t;
    } catch (e) {
      throw Sentry.captureException(e), new Error("Opensea API error: unable to fetch NFTs");
    }
  }
  async getCollectionByAssetOwner({
    address: e,
    offset: r,
    limit: t = 20
  } = {}) {
    e = {
      params: {
        asset_owner: e,
        limit: parseInt(t),
        offset: parseInt(r)
      },
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS
    };
    try {
      var s = (await axios.get(this.baseUrl + "/collections", e))["data"];
      return s;
    } catch (e) {
      throw Sentry.captureException(e), console.error(e), new Error("Opensea API error: unable to fetch NFTs");
    }
  }
  async getAsset({
    asset_contract_address: e = null,
    token_id: r = "",
    account_address: t,
    include_orders: s = !1
  } = {}) {
    if (!e || !r) throw new Error("Required params not provided");
    var a = {}, t = (t && (a.account_address = t), s && (a.include_orders = s), 
    {
      params: a,
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS
    });
    try {
      var o = (await axios.get(this.baseUrl + `/asset/${e}/` + r, t))["data"];
      return o;
    } catch (e) {
      throw Sentry.captureException(e), new Error("Opensea API error getAsset: " + e.message);
    }
  }
  async getAssetsByOwner({
    owner: e,
    cursor: r,
    limit: t = 20,
    asset_contract_addresses: s = [],
    asset_contract_address: a = null,
    token_ids: o = ""
  } = {}) {
    const n = new URLSearchParams();
    e && n.append("owner", e), r && n.append("cursor", r), t && n.append("limit", t), 
    s && s.length && s.forEach(e => {
      n.append("asset_contract_addresses", e);
    }), a && n.append("asset_contract_address", a), o && n.append("token_ids", o);
    e = {
      params: n,
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS
    };
    try {
      var i = (await axios.get(this.baseUrl + "/assets", e))["data"];
      return i;
    } catch (e) {
      throw Sentry.captureException(e), new Error("Opensea API error: unable to fetch NFTs");
    }
  }
  async getAllAssets({
    asset_contract_addresses: e = [],
    asset_contract_address: r = null,
    token_ids: t = "",
    owner: s,
    maxCount: a = 1e5
  }) {
    let o = 0;
    let n = null, i = [];
    var c = await pRetry(() => this.getAssetsByOwner({
      asset_contract_addresses: e,
      asset_contract_address: r,
      token_ids: t,
      owner: s,
      limit: 50
    }), {
      retries: 10
    });
    for (n = c?.next, i = [ ...i, ...c?.assets || [] ]; n && o < a; ) {
      var d = await pRetry(() => this.getAssetsByOwner({
        asset_contract_addresses: e,
        asset_contract_address: r,
        token_ids: t,
        owner: s,
        cursor: n,
        limit: 50
      }), {
        retries: 10
      });
      await (r => new Promise(e => setTimeout(e, r)))(300), n = d?.next, i = [ ...i, ...d?.assets || [] ], 
      o += 50;
    }
    return i;
  }
  async getAssetsByCollection({
    collection: e,
    cursor: r,
    limit: t = 20
  } = {}) {
    e = {
      params: {
        collection: e,
        limit: parseInt(t),
        cursor: r
      },
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS
    };
    try {
      var s = (await axios.get(this.baseUrl + "/assets", e))["data"];
      return s;
    } catch (e) {
      throw Sentry.captureException(e), console.error(e), new Error("Opensea API error: unable to fetch NFTs");
    }
  }
  async verifyOwnership({
    address: e,
    contractAddress: r
  } = {}) {
    if (!e || !r) return !1;
    e = {
      params: {
        owner: e,
        asset_contract_address: r
      },
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS
    };
    try {
      var t = (await axios.get(this.baseUrl + "/assets", e))["data"];
      return !!t?.assets?.[0];
    } catch (e) {
      return Sentry.captureException(e), console.error(e), !1;
    }
  }
  async refreshHandle(r) {
    let e, t, s;
    if ("OP" === r.chain) e = "optimism", t = prod().OPTIMISM_REGISTRAR_ADDRESS, 
    s = "castoptimism"; else if ("ETH" === r.chain) e = "ethereum", t = prod().REGISTRAR_ADDRESS, 
    s = "casthandles"; else {
      if ("BASE" !== r.chain) throw new Error("Invalid handle format");
      e = "base", t = prod().BASE_REGISTRAR_ADDRESS, s = "castbase";
    }
    var a = convertHexTokenIdToNumber(r.tokenId);
    if (!a) throw new Error("Invalid handle");
    if (!t) throw new Error(`Contract address not set for ${e} chain`);
    var o = `${this.baseUrl}/chain/${e}/contract/${t}/nfts/${a}/refresh`, n = {
      headers: {
        ...this.getHeaders(),
        "Content-Type": "application/json"
      },
      timeout: TIMEOUT_MS
    };
    try {
      var i = await axios.post(o, {}, n);
      if (200 === i.status) return {
        success: !0,
        message: "Refresh request successful",
        chain: e,
        collection: s,
        tokenId: a,
        handle: r.handle
      };
      throw new Error("Unexpected response status: " + i.status);
    } catch (e) {
      throw Sentry.captureException(e), console.error(`Failed to refresh handle ${r.handle}:`, e.message), 
      new Error("OpenSea API error: unable to refresh handle " + r.handle);
    }
  }
}

module.exports = {
  Service: OpenseaService
};
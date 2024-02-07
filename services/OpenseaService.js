const axios = require("axios").default, Sentry = require("@sentry/node"), pRetry = require("p-retry"), TIMEOUT_MS = 3e4;

class OpenseaService {
  constructor({
    apiKey: e,
    baseUrl: t
  }) {
    this.apiKey = e, this.baseUrl = t;
  }
  getHeaders() {
    return {
      "X-API-KEY": this.apiKey
    };
  }
  async getCollectionByContract(e) {
    var t = {
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS
    };
    try {
      var r = (await axios.get(this.baseUrl + "/asset_contract/" + e, t))["data"];
      return r;
    } catch (e) {
      throw Sentry.captureException(e), new Error("Opensea API error: unable to fetch NFTs");
    }
  }
  async getCollectionBySlug(e) {
    var t = {
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS
    };
    try {
      var r = (await axios.get(this.baseUrl + "/collection/" + e, t))["data"];
      return r;
    } catch (e) {
      throw Sentry.captureException(e), new Error("Opensea API error: unable to fetch NFTs");
    }
  }
  async getCollectionByAssetOwner({
    address: e,
    offset: t,
    limit: r = 20
  } = {}) {
    e = {
      params: {
        asset_owner: e,
        limit: parseInt(r),
        offset: parseInt(t)
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
    token_id: t = "",
    account_address: r,
    include_orders: s = !1
  } = {}) {
    if (!e || !t) throw new Error("Required params not provided");
    var a = {}, r = (r && (a.account_address = r), s && (a.include_orders = s), 
    {
      params: a,
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS
    });
    try {
      var n = (await axios.get(this.baseUrl + `/asset/${e}/` + t, r))["data"];
      return n;
    } catch (e) {
      throw Sentry.captureException(e), new Error("Opensea API error getAsset: " + e.message);
    }
  }
  async getAssetsByOwner({
    owner: e,
    cursor: t,
    limit: r = 20,
    asset_contract_addresses: s = [],
    asset_contract_address: a = null,
    token_ids: n = ""
  } = {}) {
    const o = new URLSearchParams();
    e && o.append("owner", e), t && o.append("cursor", t), r && o.append("limit", r), 
    s && s.length && s.forEach(e => {
      o.append("asset_contract_addresses", e);
    }), a && o.append("asset_contract_address", a), n && o.append("token_ids", n);
    e = {
      params: o,
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS
    };
    try {
      var c = (await axios.get(this.baseUrl + "/assets", e))["data"];
      return c;
    } catch (e) {
      throw Sentry.captureException(e), new Error("Opensea API error: unable to fetch NFTs");
    }
  }
  async getAllAssets({
    asset_contract_addresses: e = [],
    asset_contract_address: t = null,
    token_ids: r = "",
    owner: s,
    maxCount: a = 1e5
  }) {
    let n = 0;
    let o = null, c = [];
    var i = await pRetry(() => this.getAssetsByOwner({
      asset_contract_addresses: e,
      asset_contract_address: t,
      token_ids: r,
      owner: s,
      limit: 50
    }), {
      retries: 10
    });
    for (o = i?.next, c = [ ...c, ...i?.assets || [] ]; o && n < a; ) {
      var d = await pRetry(() => this.getAssetsByOwner({
        asset_contract_addresses: e,
        asset_contract_address: t,
        token_ids: r,
        owner: s,
        cursor: o,
        limit: 50
      }), {
        retries: 10
      });
      await (t => new Promise(e => setTimeout(e, t)))(300), o = d?.next, c = [ ...c, ...d?.assets || [] ], 
      n += 50;
    }
    return c;
  }
  async getAssetsByCollection({
    collection: e,
    cursor: t,
    limit: r = 20
  } = {}) {
    e = {
      params: {
        collection: e,
        limit: parseInt(r),
        cursor: t
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
    contractAddress: t
  } = {}) {
    if (!e || !t) return !1;
    e = {
      params: {
        owner: e,
        asset_contract_address: t
      },
      headers: this.getHeaders(),
      timeout: TIMEOUT_MS
    };
    try {
      var r = (await axios.get(this.baseUrl + "/assets", e))["data"];
      return !!r?.assets?.[0];
    } catch (e) {
      return Sentry.captureException(e), console.error(e), !1;
    }
  }
}

module.exports = {
  Service: OpenseaService
};
const app = require("express").Router(), Sentry = require("@sentry/node"), rateLimit = require("express-rate-limit"), _AlchemyService = require("../services/AlchemyService")["Service"], Account = require("../models/Account")["Account"], ApiKey = require("../models/ApiKey")["ApiKey"], Network = require("alchemy-sdk")["Network"], AccountInventory = require("../models/AccountInventory")["AccountInventory"], axios = require("axios"), {
  getOnchainNFTs,
  getOnchainTransactions,
  getOnchainTokens,
  DEFAULT_NETWORKS,
  DEFAULT_LIMIT,
  DEFAULT_NFT_LIMIT,
  DEFAULT_CURSORS,
  SKIP_CURSOR,
  fetchPriceHistory,
  fetchAssetMetadata
} = require("../helpers/wallet"), requireAuth = require("../helpers/auth-middleware")["requireAuth"], {
  getMemcachedClient,
  getHash
} = require("../connectmemcached"), apiKeyCache = new Map(), getLimit = s => async (e, r) => {
  var t = e.header("API-KEY");
  if (!t) return a = "Missing API-KEY header! Returning 0 for " + e.url, Sentry.captureMessage(a), 
  0;
  var a = getMemcachedClient();
  let n;
  if (apiKeyCache.has(t)) n = apiKeyCache.get(t); else try {
    var o = await a.get(getHash("WalletApiKey_getLimit:" + t));
    o && (n = new ApiKey(JSON.parse(o.value)), apiKeyCache.set(t, n));
  } catch (e) {
    console.error(e);
  }
  if (!n && (n = await ApiKey.findOne({
    key: t
  }))) {
    apiKeyCache.set(t, n);
    try {
      await a.set(getHash("WalletApiKey_getLimit:" + t), JSON.stringify(n), {
        lifetime: 3600
      });
    } catch (e) {
      console.error(e);
    }
  }
  return n ? Math.ceil(s * n.multiplier) : (o = `API-KEY ${t} not found! Returning 0 for ` + e.url, 
  console.error(o), Sentry.captureMessage(o), 0);
}, limiter = rateLimit({
  windowMs: 3e3,
  max: getLimit(2.5),
  message: "Too many requests or invalid API key! See docs.far.quest for more info.",
  validate: {
    limit: !1
  }
}), heavyLimiter = rateLimit({
  windowMs: 2e3,
  max: getLimit(.3),
  message: "Too many requests or invalid API key! See docs.far.quest for more info.",
  validate: {
    limit: !1
  }
}), authContext = async (r, e, t) => {
  try {
    if (r.context && r.context.accountId) return t();
    var a = await requireAuth(r.headers.authorization || "");
    if (!a.payload.id) throw new Error("jwt must be provided");
    var n = await Account.findById(a.payload.id);
    if (!n) throw new Error(`Account id ${a.payload.id} not found`);
    if (n.deleted) throw new Error(`Account id ${a.payload.id} deleted`);
    r.context = {
      ...r.context || {},
      accountId: a.payload.id,
      account: n
    };
  } catch (e) {
    e.message.includes("jwt must be provided") || e.message.includes("jwt malformed") || (Sentry.captureException(e), 
    console.error(e)), r.context = {
      ...r.context || {},
      accountId: null,
      account: null
    };
  }
  t();
};

app.get("/v1/nfts", [ authContext, heavyLimiter ], async (e, r) => {
  try {
    const a = parseInt(e.query.limit || DEFAULT_NFT_LIMIT), n = e.query.networks || DEFAULT_NETWORKS, o = e.query.cursors || DEFAULT_CURSORS, s = e.query.address;
    var t = await Promise.all(n.map((e, r) => o[r] === SKIP_CURSOR ? [] : getOnchainNFTs(s, e, o[r], a)));
    const i = {};
    return t.forEach((e, r) => {
      i[n[r]] = e;
    }), r.json({
      source: "v1",
      transactions: i
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v1/tokens", [ authContext, limiter ], async (e, r) => {
  try {
    parseInt(e.query.limit || DEFAULT_LIMIT);
    const a = e.query.cursors || DEFAULT_CURSORS, n = e.query.networks || DEFAULT_NETWORKS, o = e.query.address;
    var t = await Promise.all(n.map((e, r) => a[r] === SKIP_CURSOR ? [] : getOnchainTokens(o, e, a[r])));
    const s = {};
    return t.forEach((e, r) => {
      s[n[r]] = e;
    }), r.json({
      source: "v1",
      assets: s
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v1/transactions", [ authContext, limiter ], async (e, r) => {
  try {
    const a = parseInt(e.query.limit || DEFAULT_LIMIT), n = e.query.networks || DEFAULT_NETWORKS, o = e.query.cursors || DEFAULT_CURSORS, s = e.query.address;
    var t = await Promise.all(n.map((e, r) => o[r] === SKIP_CURSOR ? [] : getOnchainTransactions(s, e, {
      cursor: o[r],
      limit: a
    })));
    const i = {};
    return t.forEach((e, r) => {
      i[n[r]] = e;
    }), r.json({
      source: "v1",
      transactions: i
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v1/summary", [ authContext, limiter ], async (e, r) => {
  try {
    var t = e.query.networks || DEFAULT_NETWORKS;
    const m = e.query.address;
    var a = e.context.account, n = parseInt(e.query.limit || DEFAULT_LIMIT), o = await Promise.all(t.map(e => getOnchainTransactions(m, e, {}))), s = await Promise.all(t.map(e => getOnchainNFTs(m, e, {}))), i = await Promise.all(t.map(e => getOnchainTokens(m, e, {}))), c = await AccountInventory.findAndSort({
      rewardType: [ "IMAGE" ],
      filters: {
        account: a._id
      },
      limit: n,
      countOnly: !0
    }), u = (e, r, t = !0) => {
      return e.toLocaleString("en-US") + (t && e === r ? "+" : "");
    }, l = o.reduce((e, r) => e + r.transfers.length, 0), y = s.reduce((e, r) => e + r.ownedNfts.length, 0), d = i.reduce((e, r) => e + r.tokenBalances.filter(e => "0x0000000000000000000000000000000000000000000000000000000000000000" !== e.tokenBalance).length, 0), p = {
      itemsCount: u(c, n, !1),
      transactionsCount: u(l, n),
      nftsCount: u(y, n),
      tokensCount: u(d, n)
    };
    return r.json({
      source: "v1",
      data: p
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v1/price-history/:blockchain/:asset", async (e, r) => {
  var {
    asset: t,
    blockchain: a
  } = e.params, e = e.query.timeRange || "1d";
  try {
    var n = await fetchPriceHistory(t, a, e);
    return r.json({
      success: !0,
      data: n
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      success: !1,
      error: "Failed to fetch price history"
    });
  }
}), app.get("/v1/metadata/:network/:address", async (e, r) => {
  var {
    network: e,
    address: t
  } = e.params;
  try {
    var a = await fetchAssetMetadata(e, t);
    return r.json({
      success: !0,
      data: a
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      success: !1,
      error: "Failed to fetch asset metadata"
    });
  }
}), module.exports = {
  router: app
};
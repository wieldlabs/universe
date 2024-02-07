const app = require("express").Router(), Sentry = require("@sentry/node"), rateLimit = require("express-rate-limit"), _AlchemyService = require("../services/AlchemyService")["Service"], Account = require("../models/Account")["Account"], ApiKey = require("../models/ApiKey")["ApiKey"], Network = require("alchemy-sdk")["Network"], AccountInventory = require("../models/AccountInventory")["AccountInventory"], {
  getOnchainNFTs,
  getOnchainTransactions,
  getOnchainTokens,
  DEFAULT_NETWORKS,
  DEFAULT_LIMIT,
  DEFAULT_NFT_LIMIT,
  DEFAULT_CURSORS,
  SKIP_CURSOR
} = require("../helpers/wallet"), requireAuth = require("../helpers/auth-middleware")["requireAuth"], {
  getMemcachedClient,
  getHash
} = require("../connectmemcached"), apiKeyCache = new Map(), getLimit = i => async (e, r) => {
  var t = e.header("API-KEY");
  if (!t) return n = "Missing API-KEY header! Returning 0 for " + e.url, Sentry.captureMessage(n), 
  0;
  var n = getMemcachedClient();
  let a;
  if (apiKeyCache.has(t)) a = apiKeyCache.get(t); else try {
    var o = await n.get(getHash("WalletApiKey_getLimit:" + t));
    o && (a = new ApiKey(JSON.parse(o.value)), apiKeyCache.set(t, a));
  } catch (e) {
    console.error(e);
  }
  if (!a && (a = await ApiKey.findOne({
    key: t
  }))) {
    apiKeyCache.set(t, a);
    try {
      await n.set(getHash("WalletApiKey_getLimit:" + t), JSON.stringify(a), {
        lifetime: 3600
      });
    } catch (e) {
      console.error(e);
    }
  }
  return a ? Math.ceil(i * a.multiplier) : (o = `API-KEY ${t} not found! Returning 0 for ` + e.url, 
  console.error(o), Sentry.captureMessage(o), 0);
}, limiter = rateLimit({
  windowMs: 3e3,
  max: getLimit(2.5),
  message: "Too many requests or invalid API key! See docs.wield.co for more info.",
  validate: {
    limit: !1
  }
}), heavyLimiter = rateLimit({
  windowMs: 2e3,
  max: getLimit(.3),
  message: "Too many requests or invalid API key! See docs.wield.co for more info.",
  validate: {
    limit: !1
  }
}), authContext = async (r, e, t) => {
  try {
    if (r.context && r.context.accountId) return t();
    var n = await requireAuth(r.headers.authorization?.slice(7) || "");
    if (!n.payload.id) throw new Error("jwt must be provided");
    var a = await Account.findById(n.payload.id);
    if (!a) throw new Error(`Account id ${n.payload.id} not found`);
    if (a.deleted) throw new Error(`Account id ${n.payload.id} deleted`);
    r.context = {
      ...r.context || {},
      accountId: n.payload.id,
      account: a
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
    const n = parseInt(e.query.limit || DEFAULT_NFT_LIMIT), a = e.query.networks || DEFAULT_NETWORKS, o = e.query.cursors || DEFAULT_CURSORS, i = e.query.address;
    var t = await Promise.all(a.map((e, r) => o[r] === SKIP_CURSOR ? [] : getOnchainNFTs(i, e, o[r], n)));
    const s = {};
    return t.forEach((e, r) => {
      s[a[r]] = e;
    }), r.json({
      source: "v1",
      transactions: s
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v1/tokens", [ authContext, limiter ], async (e, r) => {
  try {
    parseInt(e.query.limit || DEFAULT_LIMIT);
    const n = e.query.cursors || DEFAULT_CURSORS, a = e.query.networks || DEFAULT_NETWORKS, o = e.query.address;
    var t = await Promise.all(a.map((e, r) => n[r] === SKIP_CURSOR ? [] : getOnchainTokens(o, e, n[r])));
    const i = {};
    return t.forEach((e, r) => {
      i[a[r]] = e;
    }), r.json({
      source: "v1",
      assets: i
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v1/transactions", [ authContext, limiter ], async (e, r) => {
  try {
    const n = parseInt(e.query.limit || DEFAULT_LIMIT), a = e.query.networks || DEFAULT_NETWORKS, o = e.query.cursors || DEFAULT_CURSORS, i = e.query.address;
    var t = await Promise.all(a.map((e, r) => o[r] === SKIP_CURSOR ? [] : getOnchainTransactions(i, e, {
      cursor: o[r],
      limit: n
    })));
    const s = {};
    return t.forEach((e, r) => {
      s[a[r]] = e;
    }), r.json({
      source: "v1",
      transactions: s
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v1/summary", [ authContext, limiter ], async (e, r) => {
  try {
    var t = e.query.networks || DEFAULT_NETWORKS;
    const p = e.query.address;
    var n = e.context.account, a = parseInt(e.query.limit || DEFAULT_LIMIT), o = await Promise.all(t.map(e => getOnchainTransactions(p, e, {}))), i = await Promise.all(t.map(e => getOnchainNFTs(p, e, {}))), s = await Promise.all(t.map(e => getOnchainTokens(p, e, {}))), c = await AccountInventory.findAndSort({
      rewardType: [ "IMAGE" ],
      filters: {
        account: n._id
      },
      limit: a,
      countOnly: !0
    }), u = (e, r, t = !0) => {
      return e.toLocaleString("en-US") + (t && e === r ? "+" : "");
    }, l = o.reduce((e, r) => e + r.transfers.length, 0), y = i.reduce((e, r) => e + r.ownedNfts.length, 0), d = s.reduce((e, r) => e + r.tokenBalances.filter(e => "0x0000000000000000000000000000000000000000000000000000000000000000" !== e.tokenBalance).length, 0), m = {
      itemsCount: u(c, a, !1),
      transactionsCount: u(l, a),
      nftsCount: u(y, a),
      tokensCount: u(d, a)
    };
    return r.json({
      source: "v1",
      data: m
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), module.exports = {
  router: app
};
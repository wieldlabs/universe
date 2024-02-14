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
  return n ? Math.ceil(i * n.multiplier) : (o = `API-KEY ${t} not found! Returning 0 for ` + e.url, 
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
    var a = await requireAuth(r.headers.authorization?.slice(7) || "");
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
    const a = parseInt(e.query.limit || DEFAULT_NFT_LIMIT), n = e.query.networks || DEFAULT_NETWORKS, o = e.query.cursors || DEFAULT_CURSORS, i = e.query.address;
    var t = await Promise.all(n.map((e, r) => o[r] === SKIP_CURSOR ? [] : getOnchainNFTs(i, e, o[r], a)));
    const s = {};
    return t.forEach((e, r) => {
      s[n[r]] = e;
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
    const a = e.query.cursors || DEFAULT_CURSORS, n = e.query.networks || DEFAULT_NETWORKS, o = e.query.address;
    var t = await Promise.all(n.map((e, r) => a[r] === SKIP_CURSOR ? [] : getOnchainTokens(o, e, a[r])));
    const i = {};
    return t.forEach((e, r) => {
      i[n[r]] = e;
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
    const a = parseInt(e.query.limit || DEFAULT_LIMIT), n = e.query.networks || DEFAULT_NETWORKS, o = e.query.cursors || DEFAULT_CURSORS, i = e.query.address;
    var t = await Promise.all(n.map((e, r) => o[r] === SKIP_CURSOR ? [] : getOnchainTransactions(i, e, {
      cursor: o[r],
      limit: a
    })));
    const s = {};
    return t.forEach((e, r) => {
      s[n[r]] = e;
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
    var a = e.context.account, n = parseInt(e.query.limit || DEFAULT_LIMIT), o = await Promise.all(t.map(e => getOnchainTransactions(p, e, {}))), i = await Promise.all(t.map(e => getOnchainNFTs(p, e, {}))), s = await Promise.all(t.map(e => getOnchainTokens(p, e, {}))), c = await AccountInventory.findAndSort({
      rewardType: [ "IMAGE" ],
      filters: {
        account: a._id
      },
      limit: n,
      countOnly: !0
    }), u = (e, r, t = !0) => {
      return e.toLocaleString("en-US") + (t && e === r ? "+" : "");
    }, l = o.reduce((e, r) => e + r.transfers.length, 0), y = i.reduce((e, r) => e + r.ownedNfts.length, 0), d = s.reduce((e, r) => e + r.tokenBalances.filter(e => "0x0000000000000000000000000000000000000000000000000000000000000000" !== e.tokenBalance).length, 0), m = {
      itemsCount: u(c, n, !1),
      transactionsCount: u(l, n),
      nftsCount: u(y, n),
      tokensCount: u(d, n)
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
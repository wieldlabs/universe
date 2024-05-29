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
  memcache,
  getHash
} = require("../connectmemcache"), apiKeyCache = new Map(), getLimit = o => async (e, r) => {
  var t, a = e.header("API-KEY");
  if (!a) return Sentry.captureMessage("Missing API-KEY header! Returning 0", {
    tags: {
      url: e.url
    }
  }), 0;
  let s;
  return apiKeyCache.has(a) ? s = apiKeyCache.get(a) : (t = await memcache.get(getHash("WalletApiKey_getLimit:" + a))) && (s = new ApiKey(JSON.parse(t.value)), 
  apiKeyCache.set(a, s)), s || (s = await ApiKey.findOne({
    key: a
  })) && (apiKeyCache.set(a, s), await memcache.set(getHash("WalletApiKey_getLimit:" + a), JSON.stringify(s), {
    lifetime: 3600
  })), s ? Math.ceil(o * s.multiplier) : (t = `API-KEY ${a} not found! Returning 0 for ` + e.url, 
  console.error(t), Sentry.captureMessage(t), 0);
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
    var s = await Account.findById(a.payload.id);
    if (!s) throw new Error(`Account id ${a.payload.id} not found`);
    if (s.deleted) throw new Error(`Account id ${a.payload.id} deleted`);
    r.context = {
      ...r.context || {},
      accountId: a.payload.id,
      account: s
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
    const a = parseInt(e.query.limit || DEFAULT_NFT_LIMIT), s = e.query.networks || DEFAULT_NETWORKS, o = e.query.cursors || DEFAULT_CURSORS, n = e.query.address;
    var t = await Promise.all(s.map((e, r) => o[r] === SKIP_CURSOR ? [] : getOnchainNFTs(n, e, o[r], a)));
    const i = {};
    return t.forEach((e, r) => {
      i[s[r]] = e;
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
    const a = e.query.cursors || DEFAULT_CURSORS, s = e.query.networks || DEFAULT_NETWORKS, o = e.query.address;
    var t = await Promise.all(s.map((e, r) => a[r] === SKIP_CURSOR ? [] : getOnchainTokens(o, e, a[r])));
    const n = {};
    return t.forEach((e, r) => {
      n[s[r]] = e;
    }), r.json({
      source: "v1",
      assets: n
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v1/transactions", [ authContext, limiter ], async (e, r) => {
  try {
    const a = parseInt(e.query.limit || DEFAULT_LIMIT), s = e.query.networks || DEFAULT_NETWORKS, o = e.query.cursors || DEFAULT_CURSORS, n = e.query.address;
    var t = await Promise.all(s.map((e, r) => o[r] === SKIP_CURSOR ? [] : getOnchainTransactions(n, e, {
      cursor: o[r],
      limit: a
    })));
    const i = {};
    return t.forEach((e, r) => {
      i[s[r]] = e;
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
    const y = e.query.address;
    var a = e.context.account, s = parseInt(e.query.limit || DEFAULT_LIMIT), o = await Promise.all(t.map(e => getOnchainTransactions(y, e, {}))), n = await Promise.all(t.map(e => getOnchainNFTs(y, e, {}))), i = await Promise.all(t.map(e => getOnchainTokens(y, e, {}))), c = await AccountInventory.findAndSort({
      rewardType: [ "IMAGE" ],
      filters: {
        account: a._id
      },
      limit: s,
      countOnly: !0
    }), u = (e, r, t = !0) => {
      return e.toLocaleString("en-US") + (t && e === r ? "+" : "");
    }, p = o.reduce((e, r) => e + r.transfers.length, 0), l = n.reduce((e, r) => e + r.ownedNfts.length, 0), h = i.reduce((e, r) => e + r.tokenBalances.filter(e => "0x0000000000000000000000000000000000000000000000000000000000000000" !== e.tokenBalance).length, 0), m = {
      itemsCount: u(c, s, !1),
      transactionsCount: u(p, s),
      nftsCount: u(l, s),
      tokensCount: u(h, s)
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
}), app.get("/v1/price-history/:blockchain/:asset", async (e, r) => {
  var {
    asset: t,
    blockchain: a
  } = e.params, e = e.query.timeRange || "1d";
  try {
    var s = await fetchPriceHistory(t, a, e);
    return r.json({
      success: !0,
      data: s
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
}), app.get("/v1/0x/price", async (e, r) => {
  var {
    sellToken: t,
    buyToken: a
  } = e.query;
  if (!t || !a) return r.status(400).json({
    error: "Missing required query parameters"
  });
  let s;
  switch (e.query.network) {
   case "Ethereum (Mainnet)":
    s = "https://api.0x.org/";
    break;

   case "Ethereum (Sepolia)":
    s = "https://sepolia.api.0x.org/";
    break;

   case "Arbitrum":
    s = "https://arbitrum.api.0x.org/";
    break;

   case "Avalanche":
    s = "https://avalanche.api.0x.org/";
    break;

   case "Base":
    s = "https://base.api.0x.org/";
    break;

   case "Binance Smart Chain":
    s = "https://bsc.api.0x.org/";
    break;

   case "Celo":
    s = "https://celo.api.0x.org/";
    break;

   case "Fantom":
    s = "https://fantom.api.0x.org/";
    break;

   case "Optimism":
    s = "https://optimism.api.0x.org/";
    break;

   case "Polygon":
    s = "https://polygon.api.0x.org/";
    break;

   case "Polygon (Mumbai)":
    s = "https://mumbai.api.0x.org/";
    break;

   default:
    s = "https://api.0x.org/";
  }
  try {
    var o = await axios.get(url);
    return r.json({
      success: !0,
      data: o.data
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      success: !1,
      error: "Failed to fetch price"
    });
  }
}), app.get("/v1/0x/quote", async (e, r) => {
  var {
    sellToken: t,
    buyToken: a,
    sellAmount: s,
    buyAmount: o
  } = e.query;
  if (!t || !a) return r.status(400).json({
    error: "Missing required query parameters"
  });
  let n;
  switch (e.query.network) {
   case "Ethereum (Mainnet)":
    n = "https://api.0x.org/";
    break;

   case "Ethereum (Sepolia)":
    n = "https://sepolia.api.0x.org/";
    break;

   case "Arbitrum":
    n = "https://arbitrum.api.0x.org/";
    break;

   case "Avalanche":
    n = "https://avalanche.api.0x.org/";
    break;

   case "Base":
    n = "https://base.api.0x.org/";
    break;

   case "Binance Smart Chain":
    n = "https://bsc.api.0x.org/";
    break;

   case "Celo":
    n = "https://celo.api.0x.org/";
    break;

   case "Fantom":
    n = "https://fantom.api.0x.org/";
    break;

   case "Optimism":
    n = "https://optimism.api.0x.org/";
    break;

   case "Polygon":
    n = "https://polygon.api.0x.org/";
    break;

   case "Polygon (Mumbai)":
    n = "https://mumbai.api.0x.org/";
    break;

   default:
    n = "https://api.0x.org/";
  }
  let i = n + `swap/v1/quote?sellToken=${t}&buyToken=${a}&feeRecipient=0x79F6D03D54dCfF1081988f2F886BB235493742F1&buyTokenPercentageFee=0.01`;
  s && (i += "&sellAmount=" + s), o && (i += "&buyAmount=" + o);
  e = {
    headers: {
      "Content-Type": "application/json",
      "0x-api-key": process.env.ZERO_X_API_KEY
    }
  };
  try {
    var c = await axios.get(i, e), u = c.data;
    return (200 === c.status ? r : r.status(c.status)).json(u);
  } catch (e) {
    return console.error("Error fetching 0x quote:", e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), module.exports = {
  router: app
};
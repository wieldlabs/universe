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
  fetchAssetMetadata,
  oneEthToUsd,
  formatWeiToUsd,
  formatEth
} = require("../helpers/wallet"), requireAuth = require("../helpers/auth-middleware")["requireAuth"], {
  memcache,
  getHash
} = require("../connectmemcache"), AlchemyService = require("../services/AlchemyService")["Service"], config = require("../helpers/config")["config"], apiKeyCache = new Map(), getLimit = o => async (e, t) => {
  var r, a = e.header("API-KEY");
  if (!a) return Sentry.captureMessage("Missing API-KEY header! Returning 0", {
    tags: {
      url: e.url
    }
  }), 0;
  let s;
  return apiKeyCache.has(a) ? s = apiKeyCache.get(a) : (r = await memcache.get(getHash("WalletApiKey_getLimit:" + a))) && (s = new ApiKey(JSON.parse(r.value)), 
  apiKeyCache.set(a, s)), s || (s = await ApiKey.findOne({
    key: a
  })) && (apiKeyCache.set(a, s), await memcache.set(getHash("WalletApiKey_getLimit:" + a), JSON.stringify(s), {
    lifetime: 3600
  })), s ? Math.ceil(o * s.multiplier) : (r = `API-KEY ${a} not found! Returning 0 for ` + e.url, 
  console.error(r), Sentry.captureMessage(r), 0);
}, limiter = rateLimit({
  windowMs: 3e3,
  max: getLimit(2.5),
  message: "Too many requests or invalid API key! See docs.wield.xyz for more info.",
  validate: {
    limit: !1
  }
}), heavyLimiter = rateLimit({
  windowMs: 2e3,
  max: getLimit(.3),
  message: "Too many requests or invalid API key! See docs.wield.xyz for more info.",
  validate: {
    limit: !1
  }
}), authContext = async (t, e, r) => {
  try {
    if (t.context && t.context.accountId) return r();
    var a = await requireAuth(t.headers.authorization || "");
    if (!a.payload.id) throw new Error("jwt must be provided");
    var s = await Account.findById(a.payload.id);
    if (!s) throw new Error(`Account id ${a.payload.id} not found`);
    if (s.deleted) throw new Error(`Account id ${a.payload.id} deleted`);
    t.context = {
      ...t.context || {},
      accountId: a.payload.id,
      account: s
    };
  } catch (e) {
    e.message.includes("jwt must be provided") || e.message.includes("jwt malformed") || (Sentry.captureException(e), 
    console.error(e)), t.context = {
      ...t.context || {},
      accountId: null,
      account: null
    };
  }
  r();
};

app.get("/v1/nfts", [ heavyLimiter, authContext ], async (e, t) => {
  try {
    const a = parseInt(e.query.limit || DEFAULT_NFT_LIMIT), s = e.query.networks || DEFAULT_NETWORKS, o = e.query.cursors || DEFAULT_CURSORS, n = e.query.address;
    var r = await Promise.all(s.map((e, t) => o[t] === SKIP_CURSOR ? [] : getOnchainNFTs(n, e, o[t], a)));
    const i = {};
    return r.forEach((e, t) => {
      i[s[t]] = e;
    }), t.json({
      source: "v1",
      transactions: i
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v1/tokens", [ limiter, authContext ], async (e, t) => {
  try {
    parseInt(e.query.limit || DEFAULT_LIMIT);
    const a = e.query.cursors || DEFAULT_CURSORS, s = e.query.networks || DEFAULT_NETWORKS, o = e.query.address;
    var r = await Promise.all(s.map((e, t) => a[t] === SKIP_CURSOR ? [] : getOnchainTokens(o, e, a[t])));
    const n = {};
    return r.forEach((e, t) => {
      n[s[t]] = e;
    }), t.json({
      source: "v1",
      assets: n
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v1/transactions", [ limiter, authContext ], async (e, t) => {
  try {
    const a = parseInt(e.query.limit || DEFAULT_LIMIT), s = e.query.networks || DEFAULT_NETWORKS, o = e.query.cursors || DEFAULT_CURSORS, n = e.query.address;
    var r = await Promise.all(s.map((e, t) => o[t] === SKIP_CURSOR ? [] : getOnchainTransactions(n, e, {
      cursor: o[t],
      limit: a
    })));
    const i = {};
    return r.forEach((e, t) => {
      i[s[t]] = e;
    }), t.json({
      source: "v1",
      transactions: i
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v1/summary", [ limiter, authContext ], async (e, t) => {
  try {
    var r = e.query.networks || DEFAULT_NETWORKS;
    const y = e.query.address;
    var a = e.context.account, s = parseInt(e.query.limit || DEFAULT_LIMIT), o = await Promise.all(r.map(e => getOnchainTransactions(y, e, {}))), n = await Promise.all(r.map(e => getOnchainNFTs(y, e, {}))), i = await Promise.all(r.map(e => getOnchainTokens(y, e, {}))), c = await AccountInventory.findAndSort({
      rewardType: [ "IMAGE" ],
      filters: {
        account: a._id
      },
      limit: s,
      countOnly: !0
    }), u = (e, t, r = !0) => {
      return e.toLocaleString("en-US") + (r && e === t ? "+" : "");
    }, p = o.reduce((e, t) => e + t.transfers.length, 0), l = n.reduce((e, t) => e + t.ownedNfts.length, 0), m = i.reduce((e, t) => e + t.tokenBalances.filter(e => "0x0000000000000000000000000000000000000000000000000000000000000000" !== e.tokenBalance).length, 0), h = {
      itemsCount: u(c, s, !1),
      transactionsCount: u(p, s),
      nftsCount: u(l, s),
      tokensCount: u(m, s)
    };
    return t.json({
      source: "v1",
      data: h
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v1/token/summary", [ limiter, authContext ], async (e, t) => {
  e = e.query.address;
  if (!e) return t.status(400).json({
    error: "Address parameter is required"
  });
  var r = new AlchemyService({
    apiKey: config().ETH_NODE_URL,
    chain: "eth-mainnet"
  }), a = new AlchemyService({
    apiKey: config().OPTIMISM_NODE_URL,
    chain: "opt-mainnet"
  }), s = new AlchemyService({
    apiKey: config().BASE_NODE_URL,
    chain: "base-mainnet"
  });
  try {
    var [ o, n, i, c ] = await Promise.all([ r.getBalance(e, "latest"), a.getBalance(e, "latest"), s.getBalance(e, "latest"), oneEthToUsd() ]);
    return t.json({
      success: !0,
      data: {
        ethereum: {
          wei: o,
          symbol: "ETH",
          usd: formatWeiToUsd(o, c),
          eth: formatEth(o)
        },
        optimism: {
          wei: n,
          symbol: "ETH",
          usd: formatWeiToUsd(n, c),
          eth: formatEth(n)
        },
        base: {
          wei: i,
          symbol: "ETH",
          usd: formatWeiToUsd(i, c),
          eth: formatEth(i)
        }
      }
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      success: !1,
      error: "Failed to fetch token balances"
    });
  }
}), app.get("/v1/price-history/:blockchain/:asset", async (e, t) => {
  var {
    asset: r,
    blockchain: a
  } = e.params, e = e.query.timeRange || "1d";
  try {
    var s = await fetchPriceHistory(r, a, e);
    return t.json({
      success: !0,
      data: s
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      success: !1,
      error: "Failed to fetch price history"
    });
  }
}), app.get("/v1/metadata/:network/:address", async (e, t) => {
  var {
    network: e,
    address: r
  } = e.params;
  try {
    var a = await fetchAssetMetadata(e, r);
    return t.json({
      success: !0,
      data: a
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      success: !1,
      error: "Failed to fetch asset metadata"
    });
  }
}), app.get("/v1/0x/price", async (e, t) => {
  var {
    sellToken: r,
    buyToken: a,
    sellAmount: s,
    buyAmount: o
  } = e.query;
  if (!r || !a) return t.status(400).json({
    error: "Missing required query parameters"
  });
  var n = getHash(`0x-price:${r}:${a}:${s}:` + o), i = await memcache.get(n);
  if (i) return t.json(JSON.parse(i.value));
  let c;
  switch (e.query.network) {
   case "Ethereum (Mainnet)":
    c = "https://api.0x.org/";
    break;

   case "Ethereum (Sepolia)":
    c = "https://sepolia.api.0x.org/";
    break;

   case "Arbitrum":
    c = "https://arbitrum.api.0x.org/";
    break;

   case "Avalanche":
    c = "https://avalanche.api.0x.org/";
    break;

   case "Base":
    c = "https://base.api.0x.org/";
    break;

   case "Binance Smart Chain":
    c = "https://bsc.api.0x.org/";
    break;

   case "Celo":
    c = "https://celo.api.0x.org/";
    break;

   case "Fantom":
    c = "https://fantom.api.0x.org/";
    break;

   case "Optimism":
    c = "https://optimism.api.0x.org/";
    break;

   case "Polygon":
    c = "https://polygon.api.0x.org/";
    break;

   case "Polygon (Mumbai)":
    c = "https://mumbai.api.0x.org/";
    break;

   default:
    c = "https://api.0x.org/";
  }
  let u = c + `swap/v1/quote?sellToken=${r}&buyToken=${a}&feeRecipient=0x79F6D03D54dCfF1081988f2F886BB235493742F1&buyTokenPercentageFee=0.01`;
  s && (u += "&sellAmount=" + s), o && (u += "&buyAmount=" + o);
  i = {
    headers: {
      "Content-Type": "application/json",
      "0x-api-key": process.env.ZERO_X_API_KEY
    }
  };
  try {
    var p = {
      success: !0,
      data: (await axios.get(u, i)).data
    };
    return await memcache.set(n, JSON.stringify(p), {
      lifetime: 5
    }), t.json(p);
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      success: !1,
      error: "Failed to fetch price"
    });
  }
}), app.get("/v1/0x/quote", async (e, t) => {
  var {
    sellToken: r,
    buyToken: a,
    sellAmount: s,
    buyAmount: o
  } = e.query;
  if (!r || !a) return t.status(400).json({
    error: "Missing required query parameters"
  });
  var n = getHash(`0x-quote:${r}:${a}:${s}:` + o), i = await memcache.get(n);
  if (i) return t.json(JSON.parse(i.value));
  let c;
  switch (e.query.network) {
   case "Ethereum (Mainnet)":
    c = "https://api.0x.org/";
    break;

   case "Ethereum (Sepolia)":
    c = "https://sepolia.api.0x.org/";
    break;

   case "Arbitrum":
    c = "https://arbitrum.api.0x.org/";
    break;

   case "Avalanche":
    c = "https://avalanche.api.0x.org/";
    break;

   case "Base":
    c = "https://base.api.0x.org/";
    break;

   case "Binance Smart Chain":
    c = "https://bsc.api.0x.org/";
    break;

   case "Celo":
    c = "https://celo.api.0x.org/";
    break;

   case "Fantom":
    c = "https://fantom.api.0x.org/";
    break;

   case "Optimism":
    c = "https://optimism.api.0x.org/";
    break;

   case "Polygon":
    c = "https://polygon.api.0x.org/";
    break;

   case "Polygon (Mumbai)":
    c = "https://mumbai.api.0x.org/";
    break;

   default:
    c = "https://api.0x.org/";
  }
  let u = c + `swap/v1/quote?sellToken=${r}&buyToken=${a}&feeRecipient=0x79F6D03D54dCfF1081988f2F886BB235493742F1&buyTokenPercentageFee=0.01`;
  s && (u += "&sellAmount=" + s), o && (u += "&buyAmount=" + o);
  i = {
    headers: {
      "Content-Type": "application/json",
      "0x-api-key": process.env.ZERO_X_API_KEY
    }
  };
  try {
    var p = await axios.get(u, i), l = p.data;
    return (200 === p.status ? (await memcache.set(n, JSON.stringify(l), {
      lifetime: 5
    }), t) : t.status(p.status)).json(l);
  } catch (e) {
    return console.error("Error fetching 0x quote:", e), t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/0x/quote", [ limiter ], async (e, t) => {
  var {
    sellToken: e,
    buyToken: r,
    sellAmount: a,
    taker: s,
    chainId: o,
    slippageBps: n = 100
  } = e.query;
  if (!(e && r && s && a && o)) return t.status(400).json({
    error: "Missing required query parameters"
  });
  var i = {
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    symbol: "WETH"
  };
  let c = `https://api.0x.org/swap/permit2/quote?sellToken=${e}&buyToken=${r}&taker=${s}&chainId=${o}&swapFeeRecipient=0x79F6D03D54dCfF1081988f2F886BB235493742F1&swapFeeBps=100`, u = (a && (c += "&sellAmount=" + a), 
  i.address);
  r.toLowerCase() !== i.address.toLowerCase() && e.toLowerCase() !== i.address.toLowerCase() && (u = r), 
  c += "&swapFeeToken=" + u, n && (c += "&slippageBps=" + n);
  s = {
    headers: {
      "Content-Type": "application/json",
      "0x-api-key": process.env.ZERO_X_API_KEY,
      "0x-version": "v2"
    }
  };
  try {
    var p = await axios.get(c, s);
    return t.json({
      success: !0,
      data: p.data
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      success: !1,
      error: "Failed to fetch price"
    });
  }
}), app.get("/v2/0x/price", [ limiter ], async (e, t) => {
  var {
    sellToken: e,
    buyToken: r,
    sellAmount: a,
    chainId: s,
    slippageBps: o = 100,
    taker: n
  } = e.query;
  if (!(e && r && a && s)) return t.status(400).json({
    error: "Missing required query parameters"
  });
  var i = getHash(`0x-price-v2:${e}:${r}:${a}:${s}:${o}:` + n), c = await memcache.get(i);
  if (c) return t.json(JSON.parse(c.value));
  c = {
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    symbol: "ETH"
  };
  let u = `https://api.0x.org/swap/permit2/price?sellToken=${e}&buyToken=${r}&taker=${n}&chainId=${s}&swapFeeRecipient=0x79F6D03D54dCfF1081988f2F886BB235493742F1&swapFeeBps=100`, p = (a && (u += "&sellAmount=" + a), 
  c.address);
  r.toLowerCase() !== c.address.toLowerCase() && e.toLowerCase() !== c.address.toLowerCase() && (p = r), 
  u += "&swapFeeToken=" + p, o && (u += "&slippageBps=" + o);
  n = {
    headers: {
      "Content-Type": "application/json",
      "0x-api-key": process.env.ZERO_X_API_KEY,
      "0x-version": "v2"
    }
  };
  try {
    var l = {
      success: !0,
      data: (await axios.get(u, n)).data
    };
    return await memcache.set(i, JSON.stringify(l), {
      lifetime: 2
    }), t.json(l);
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      success: !1,
      error: "Failed to fetch price"
    });
  }
}), module.exports = {
  router: app
};
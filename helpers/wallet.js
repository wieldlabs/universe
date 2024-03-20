const prod = require("../helpers/registrar")["prod"], axios = require("axios"), {
  Alchemy,
  Network,
  TokenBalanceType
} = require("alchemy-sdk"), {
  getMemcachedClient,
  getHash
} = require("../connectmemcached");

async function getAccountAssets() {}

async function getOnchainNFTs(e, t, a, r = DEFAULT_NFT_LIMIT) {
  var n = getMemcachedClient();
  try {
    var c = await n.get(getHash(`Wallet_getOnchainNFTs:${r}:${t}:${a}:` + e));
    if (c) return JSON.parse(c.value);
  } catch (e) {
    console.error(e);
  }
  var c = {
    apiKey: prod().NODE_URL,
    network: t
  }, c = new Alchemy(c), s = {
    pageSize: r
  }, c = (a && (s.cursor = a), await c.nft.getNftsForOwner(e, s));
  c.ownedNfts = c.ownedNfts.map(e => {
    return delete e.image.originalUrl, delete e.raw, e;
  });
  try {
    await n.set(getHash(`Wallet_getOnchainNFTs:${r}:${t}:${a}:` + e), JSON.stringify(c), {
      lifetime: 86400
    });
  } catch (e) {
    console.error(e);
  }
  return c;
}

async function getOnchainTokenMetadata(e, t) {
  var t = {
    apiKey: prod().NODE_URL,
    network: t
  }, t = new Alchemy(t), a = getMemcachedClient();
  try {
    var r = await a.get(getHash("Wallet_getOnchainTokenMetadata:" + e));
    if (r) return JSON.parse(r.value);
  } catch (e) {
    console.error(e);
  }
  r = await t.core.getTokenMetadata(e);
  try {
    await a.set(getHash("Wallet_getOnchainTokenMetadata:" + e), JSON.stringify(r), {
      lifetime: 86400
    });
  } catch (e) {
    console.error(e);
  }
  return r;
}

async function getOnchainTokens(e, t, a = DEFAULT_LIMIT, r = null, n = DEFAULT_FILTER_NO_SYMBOL) {
  var c = {
    apiKey: prod().NODE_URL,
    network: t
  }, s = getMemcachedClient();
  try {
    var i = await s.get(getHash(`Wallet_getOnchainTokens:${a}:${t}:${r}:${e}:` + n));
    if (i) return JSON.parse(i.value);
  } catch (e) {
    console.error(e);
  }
  i = new Alchemy(c), c = {
    type: TokenBalanceType.ERC20,
    pageSize: a
  }, r && (c.pageKey = r), i = await i.core.getTokenBalances(e, c), c = i.tokenBalances.map(e => getOnchainTokenMetadata(e.contractAddress, t));
  const o = await Promise.all(c);
  i.tokenBalances = i.tokenBalances.map((e, t) => ({
    ...e,
    metadata: o[t]
  })), i.tokenBalances = i.tokenBalances.filter(e => e.metadata?.symbol);
  try {
    await s.set(getHash(`Wallet_getOnchainTokens:${a}:${t}:${r}:${e}:` + n), JSON.stringify(i), {
      lifetime: 3600
    });
  } catch (e) {
    console.error(e);
  }
  return i;
}

async function getOnchainTransactions(e, t, {
  cursor: a = null,
  category: r = [ "external", "erc20", "erc721", "erc1155" ],
  fromBlock: n = "0x0",
  limit: c = DEFAULT_LIMIT
}) {
  var s = {
    apiKey: prod().NODE_URL,
    network: t
  }, i = getMemcachedClient();
  try {
    var o = await i.get(getHash(`Wallet_getOnchainTransactions:${c}:${t}:${a}:` + e));
    if (o) return JSON.parse(o.value);
  } catch (e) {
    console.error(e);
  }
  o = new Alchemy(s), s = {
    fromBlock: n,
    toAddress: e,
    excludeZeroValue: !0,
    category: r,
    limit: c
  }, a && (s.pageKey = a), n = await o.core.getAssetTransfers(s);
  try {
    await i.set(getHash(`Wallet_getOnchainTransactions:${c}:${t}:${a}:` + e), JSON.stringify(n), {
      lifetime: 3600
    });
  } catch (e) {
    console.error(e);
  }
  return n;
}

function isDataFreshEnough(e, t = 36e5) {
  e = new Date(e).getTime();
  return Date.now() - e < t;
}

function normalizeTimeToRangeStart(e, t) {
  var a = new Date(e);
  switch (t) {
   case "1d":
    a.setHours(0, 0, 0, 0);
    break;

   case "7d":
   case "1w":
    a.setDate(a.getDate() - a.getDay()), a.setHours(0, 0, 0, 0);
    break;

   case "1m":
    a.setDate(1), a.setHours(0, 0, 0, 0);
    break;

   default:
    throw new Error("Unsupported time range: " + t);
  }
  return a.toISOString();
}

function calculateTTL(e) {
  switch (e) {
   case "1d":
    return 86400;

   case "1w":
    return 604800;

   case "1m":
    return 2592e3;

   default:
    return 3600;
  }
}

async function fetchPriceHistory(c, s, e) {
  const i = getMemcachedClient();
  var t = normalizeTimeToRangeStart(new Date(), e);
  const o = `wallet:fetchPriceHistory:${s}:${c}:${e}:` + t;
  try {
    var a, r = await i.get(o);
    return r && (a = JSON.parse(r.value), "1d" !== e || isDataFreshEnough(a.timestamp, 6e4)) ? a : await n({
      from: t,
      range: e
    });
  } catch (e) {
    throw console.error(e), e;
  }
  async function n({
    range: e = "1d"
  }) {
    let t;
    var a = new Date();
    switch (e) {
     case "1d":
      t = a.getTime();
      break;

     case "1w":
     case "7d":
      a.setDate(a.getDate() - 7), t = a.getTime();
      break;

     default:
      t = a.getTime();
    }
    try {
      var r = new URLSearchParams({
        asset: c,
        blockchain: s,
        from: t
      }).toString(), n = (await axios.get("https://api.mobula.io/api/1/market/history?" + r, {
        headers: {
          Authorization: process.env.MOBULA_API_KEY
        }
      })).data;
      return n.timestamp = new Date().toISOString(), await i.set(o, JSON.stringify(n.data || {}), {
        lifetime: calculateTTL(e)
      }), n.data;
    } catch (e) {
      throw console.error("Failed to fetch and cache:", e), e;
    }
  }
}

async function fetchAssetMetadata(e, t) {
  var a = getMemcachedClient(), r = `wallet:fetchAssetMetadata:${e}:` + t;
  try {
    var n, c, s = await a.get(r);
    return s ? JSON.parse(s.value) : (n = new URLSearchParams({
      asset: t
    }), e && n.append("blockchain", e), c = (await axios.get("https://api.mobula.io/api/1/metadata?" + n.toString(), {
      headers: {
        Authorization: process.env.MOBULA_API_KEY
      }
    })).data, await a.set(r, JSON.stringify(c?.data || {}), {
      lifetime: 3600
    }), c?.data);
  } catch (e) {
    throw console.error("Failed to fetch and cache metadata:", e), e;
  }
}

const DEFAULT_NETWORKS = [ Network.ETH_MAINNET, Network.OPT_MAINNET, Network.BASE_MAINNET, Network.MATIC_MAINNET ], DEFAULT_CURSOR = null, DEFAULT_CURSORS = [ DEFAULT_CURSOR, DEFAULT_CURSOR, DEFAULT_CURSOR, DEFAULT_CURSOR ], DEFAULT_LIMIT = 100, DEFAULT_NFT_LIMIT = 100, SKIP_CURSOR = "skip", DEFAULT_FILTER_NO_SYMBOL = !0;

module.exports = {
  getAccountAssets: getAccountAssets,
  getOnchainTokens: getOnchainTokens,
  getOnchainTransactions: getOnchainTransactions,
  getOnchainNFTs: getOnchainNFTs,
  DEFAULT_NETWORKS: DEFAULT_NETWORKS,
  DEFAULT_LIMIT: DEFAULT_LIMIT,
  DEFAULT_CURSOR: DEFAULT_CURSOR,
  DEFAULT_CURSORS: DEFAULT_CURSORS,
  SKIP_CURSOR: SKIP_CURSOR,
  DEFAULT_FILTER_NO_SYMBOL: DEFAULT_FILTER_NO_SYMBOL,
  fetchPriceHistory: fetchPriceHistory,
  fetchAssetMetadata: fetchAssetMetadata
};
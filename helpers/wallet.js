const prod = require("../helpers/registrar")["prod"], axios = require("axios"), {
  Alchemy,
  Network,
  TokenBalanceType
} = require("alchemy-sdk"), {
  memcache,
  getHash
} = require("../connectmemcache"), normalizeTimeToRangeStart = require("./timerange")["normalizeTimeToRangeStart"];

async function getAccountAssets() {}

async function getOnchainNFTs(e, a, t, n = DEFAULT_NFT_LIMIT) {
  var r, c = await memcache.get(getHash(`Wallet_getOnchainNFTs:${n}:${a}:${t}:` + e));
  return c ? JSON.parse(c.value) : (c = {
    apiKey: prod().NODE_URL,
    network: a
  }, c = new Alchemy(c), r = {
    pageSize: n
  }, t && (r.cursor = t), (c = await c.nft.getNftsForOwner(e, r)).ownedNfts = c.ownedNfts.map(e => {
    return delete e.image.originalUrl, delete e.raw, e;
  }), await memcache.set(getHash(`Wallet_getOnchainNFTs:${n}:${a}:${t}:` + e), JSON.stringify(c), {
    lifetime: 86400
  }), c);
}

async function getOnchainTokenMetadata(e, a) {
  var a = {
    apiKey: prod().NODE_URL,
    network: a
  }, a = new Alchemy(a), t = await memcache.get(getHash("Wallet_getOnchainTokenMetadata:" + e));
  return t ? JSON.parse(t.value) : (t = await a.core.getTokenMetadata(e), await memcache.set(getHash("Wallet_getOnchainTokenMetadata:" + e), JSON.stringify(t), {
    lifetime: 86400
  }), t);
}

async function getOnchainTokens(e, a, t = DEFAULT_LIMIT, n = null, r = DEFAULT_FILTER_NO_SYMBOL) {
  var c = {
    apiKey: prod().NODE_URL,
    network: a
  }, s = await memcache.get(getHash(`Wallet_getOnchainTokens:${t}:${a}:${n}:${e}:` + r));
  if (s) return JSON.parse(s.value);
  s = new Alchemy(c), c = {
    type: TokenBalanceType.ERC20,
    pageSize: t
  }, n && (c.pageKey = n), s = await s.core.getTokenBalances(e, c), c = s.tokenBalances.map(e => getOnchainTokenMetadata(e.contractAddress, a));
  const i = await Promise.all(c);
  return s.tokenBalances = s.tokenBalances.map((e, a) => ({
    ...e,
    metadata: i[a]
  })), s.tokenBalances = s.tokenBalances.filter(e => e.metadata?.symbol), await memcache.set(getHash(`Wallet_getOnchainTokens:${t}:${a}:${n}:${e}:` + r), JSON.stringify(s), {
    lifetime: 3600
  }), s;
}

async function getOnchainTransactions(e, a, {
  cursor: t = null,
  category: n = [ "external", "erc20", "erc721", "erc1155" ],
  fromBlock: r = "0x0",
  limit: c = DEFAULT_LIMIT
}) {
  var s = {
    apiKey: prod().NODE_URL,
    network: a
  }, i = await memcache.get(getHash(`Wallet_getOnchainTransactions:${c}:${a}:${t}:` + e));
  return i ? JSON.parse(i.value) : (i = new Alchemy(s), s = {
    fromBlock: r,
    toAddress: e,
    excludeZeroValue: !0,
    category: n,
    limit: c
  }, t && (s.pageKey = t), r = await i.core.getAssetTransfers(s), await memcache.set(getHash(`Wallet_getOnchainTransactions:${c}:${a}:${t}:` + e), JSON.stringify(r), {
    lifetime: 3600
  }), r);
}

function calculateTTL(e) {
  switch (e) {
   case "1h":
    return 3600;

   case "1d":
    return 86400;

   case "3d":
    return 259200;

   case "1w":
    return 604800;

   case "1m":
    return 2592e3;

   default:
    return 3600;
  }
}

async function fetchPriceHistory(c, s, e) {
  var a = new Date(), a = normalizeTimeToRangeStart(a, e);
  const i = `wallet:fetchPriceHistory:${s}:${c}:${e}:` + a;
  a = await memcache.get(i);
  return a ? JSON.parse(a.value) : async function({
    range: e = "1d"
  }) {
    let a;
    var t = new Date();
    switch (e) {
     case "1h":
      t.setHours(t.getHours() - 1), a = t.getTime();
      break;

     case "1d":
      t.setDate(t.getDate() - 1), a = t.getTime();
      break;

     case "3d":
      t.setDate(t.getDate() - 3), a = t.getTime();
      break;

     case "1w":
     case "7d":
      t.setDate(t.getDate() - 7), a = t.getTime();
      break;

     case "1m":
      t.setDate(1), t.setHours(0, 0, 0, 0), a = t.getTime();
      break;

     default:
      a = t.getTime();
    }
    try {
      var n = new URLSearchParams({
        asset: c,
        blockchain: s,
        from: a
      }).toString(), r = (await axios.get("https://api.mobula.io/api/1/market/history?" + n, {
        headers: {
          Authorization: process.env.MOBULA_API_KEY
        }
      })).data;
      return r.timestamp = new Date().toISOString(), await memcache.set(i, JSON.stringify(r.data || {}), {
        lifetime: calculateTTL(e)
      }), r.data;
    } catch (e) {
      throw console.error("Failed to fetch and cache:", e), e;
    }
  }({
    range: e
  });
}

async function fetchAssetMetadata(e, a) {
  var t = `wallet:fetchAssetMetadata:${e}:` + a;
  try {
    var n, r, c = await memcache.get(t);
    return c ? JSON.parse(c.value) : (n = new URLSearchParams({
      asset: a
    }), e && n.append("blockchain", e), r = (await axios.get("https://api.mobula.io/api/1/metadata?" + n.toString(), {
      headers: {
        Authorization: process.env.MOBULA_API_KEY
      }
    })).data, await memcache.set(t, JSON.stringify(r?.data || {}), {
      lifetime: 3600
    }), r?.data);
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
const prod = require("../helpers/registrar")["prod"], axios = require("axios"), {
  Alchemy,
  Network,
  TokenBalanceType
} = require("alchemy-sdk"), {
  memcache,
  getHash
} = require("../connectmemcache"), normalizeTimeToRangeStart = require("./timerange")["normalizeTimeToRangeStart"], MarketplaceService = require("../services/MarketplaceService")["Service"], ethers = require("ethers")["ethers"];

async function getAccountAssets() {}

async function getOnchainNFTs(e, t, a, r = DEFAULT_NFT_LIMIT) {
  var n, c = await memcache.get(getHash(`Wallet_getOnchainNFTs:${r}:${t}:${a}:` + e));
  return c ? JSON.parse(c.value) : (c = {
    apiKey: prod().NODE_URL,
    network: t
  }, c = new Alchemy(c), n = {
    pageSize: r
  }, a && (n.cursor = a), (c = await c.nft.getNftsForOwner(e, n)).ownedNfts = c.ownedNfts.map(e => {
    return delete e.image.originalUrl, delete e.raw, e;
  }), await memcache.set(getHash(`Wallet_getOnchainNFTs:${r}:${t}:${a}:` + e), JSON.stringify(c), {
    lifetime: 86400
  }), c);
}

async function getOnchainTokenMetadata(e, t) {
  var t = {
    apiKey: prod().NODE_URL,
    network: t
  }, t = new Alchemy(t), a = await memcache.get(getHash("Wallet_getOnchainTokenMetadata:" + e));
  return a ? JSON.parse(a.value) : (a = await t.core.getTokenMetadata(e), await memcache.set(getHash("Wallet_getOnchainTokenMetadata:" + e), JSON.stringify(a), {
    lifetime: 86400
  }), a);
}

async function getOnchainTokens(e, t, a = DEFAULT_LIMIT, r = null, n = DEFAULT_FILTER_NO_SYMBOL) {
  var c = {
    apiKey: prod().NODE_URL,
    network: t
  }, s = await memcache.get(getHash(`Wallet_getOnchainTokens:${a}:${t}:${r}:${e}:` + n));
  if (s) return JSON.parse(s.value);
  s = new Alchemy(c), c = {
    type: TokenBalanceType.ERC20,
    pageSize: a
  }, r && (c.pageKey = r), s = await s.core.getTokenBalances(e, c), c = s.tokenBalances.map(e => getOnchainTokenMetadata(e.contractAddress, t));
  const i = await Promise.all(c);
  return s.tokenBalances = s.tokenBalances.map((e, t) => ({
    ...e,
    metadata: i[t]
  })), s.tokenBalances = s.tokenBalances.filter(e => e.metadata?.symbol), await memcache.set(getHash(`Wallet_getOnchainTokens:${a}:${t}:${r}:${e}:` + n), JSON.stringify(s), {
    lifetime: 3600
  }), s;
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
  }, i = await memcache.get(getHash(`Wallet_getOnchainTransactions:${c}:${t}:${a}:` + e));
  return i ? JSON.parse(i.value) : (i = new Alchemy(s), s = {
    fromBlock: n,
    toAddress: e,
    excludeZeroValue: !0,
    category: r,
    limit: c
  }, a && (s.pageKey = a), n = await i.core.getAssetTransfers(s), await memcache.set(getHash(`Wallet_getOnchainTransactions:${c}:${t}:${a}:` + e), JSON.stringify(n), {
    lifetime: 3600
  }), n);
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
  var t = new Date(), t = normalizeTimeToRangeStart(t, e);
  const i = `wallet:fetchPriceHistory:${s}:${c}:${e}:` + t;
  t = await memcache.get(i);
  return t ? JSON.parse(t.value) : async function({
    range: e = "1d"
  }) {
    let t;
    var a = new Date();
    switch (e) {
     case "1h":
      a.setHours(a.getHours() - 1), t = a.getTime();
      break;

     case "1d":
      a.setDate(a.getDate() - 1), t = a.getTime();
      break;

     case "3d":
      a.setDate(a.getDate() - 3), t = a.getTime();
      break;

     case "1w":
     case "7d":
      a.setDate(a.getDate() - 7), t = a.getTime();
      break;

     case "1m":
      a.setDate(1), a.setHours(0, 0, 0, 0), t = a.getTime();
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
      return n.timestamp = new Date().toISOString(), await memcache.set(i, JSON.stringify(n.data || {}), {
        lifetime: calculateTTL(e)
      }), n.data;
    } catch (e) {
      throw console.error("Failed to fetch and cache:", e), e;
    }
  }({
    range: e
  });
}

async function fetchAssetMetadata(e, t) {
  var a = `wallet:fetchAssetMetadata:${e}:` + t;
  try {
    var r, n, c = await memcache.get(a);
    return c ? JSON.parse(c.value) : (r = new URLSearchParams({
      asset: t
    }), e && r.append("blockchain", e), n = (await axios.get("https://api.mobula.io/api/1/metadata?" + r.toString(), {
      headers: {
        Authorization: process.env.MOBULA_API_KEY
      }
    })).data, await memcache.set(a, JSON.stringify(n?.data || {}), {
      lifetime: 3600
    }), n?.data);
  } catch (e) {
    throw console.error("Failed to fetch and cache metadata:", e), e;
  }
}

const oneEthToUsd = () => {
  return new MarketplaceService().ethToUsd(1);
}, formatWeiToUsd = (e, t) => {
  var a = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  try {
    return a.format(ethers.utils.formatEther(ethers.BigNumber.from(e || "0").mul(t)));
  } catch (e) {
    return console.error("Failed to format wei to usd:", e), "0.00";
  }
}, formatEth = e => ethers.utils.formatEther(ethers.BigNumber.from(e || "0")), DEFAULT_NETWORKS = [ Network.ETH_MAINNET, Network.OPT_MAINNET, Network.BASE_MAINNET, Network.MATIC_MAINNET ], DEFAULT_CURSOR = null, DEFAULT_CURSORS = [ DEFAULT_CURSOR, DEFAULT_CURSOR, DEFAULT_CURSOR, DEFAULT_CURSOR ], DEFAULT_LIMIT = 100, DEFAULT_NFT_LIMIT = 100, SKIP_CURSOR = "skip", DEFAULT_FILTER_NO_SYMBOL = !0;

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
  fetchAssetMetadata: fetchAssetMetadata,
  oneEthToUsd: oneEthToUsd,
  formatWeiToUsd: formatWeiToUsd,
  formatEth: formatEth
};
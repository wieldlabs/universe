const _AlchemyService = require("../services/AlchemyService")["Service"], prod = require("../helpers/registrar")["prod"], Token = require("../models/wallet/Token")["Token"], AccountInventory = require("../models/AccountInventory")["AccountInventory"], Contract = require("../models/wallet/Contract")["Contract"], {
  Alchemy,
  Network,
  TokenBalanceType
} = require("alchemy-sdk"), {
  getMemcachedClient,
  getHash
} = require("../connectmemcached");

async function getAccountAssets() {}

async function getOnchainNFTs(e, t, a, n = DEFAULT_NFT_LIMIT) {
  var r = getMemcachedClient();
  try {
    var c = await r.get(getHash(`Wallet_getOnchainNFTs:${n}:${t}:${a}:` + e));
    if (c) return JSON.parse(c.value);
  } catch (e) {
    console.error(e);
  }
  var c = {
    apiKey: prod().NODE_URL,
    network: t
  }, c = new Alchemy(c), o = {
    pageSize: n
  }, c = (a && (o.cursor = a), await c.nft.getNftsForOwner(e, o));
  c.ownedNfts = c.ownedNfts.map(e => {
    return delete e.image.originalUrl, delete e.raw, e;
  });
  try {
    await r.set(getHash(`Wallet_getOnchainNFTs:${n}:${t}:${a}:` + e), JSON.stringify(c), {
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
    var n = await a.get(getHash("Wallet_getOnchainTokenMetadata:" + e));
    if (n) return JSON.parse(n.value);
  } catch (e) {
    console.error(e);
  }
  n = await t.core.getTokenMetadata(e);
  try {
    await a.set(getHash("Wallet_getOnchainTokenMetadata:" + e), JSON.stringify(n), {
      lifetime: 86400
    });
  } catch (e) {
    console.error(e);
  }
  return n;
}

async function getOnchainTokens(e, t, a = DEFAULT_LIMIT, n = null, r = DEFAULT_FILTER_NO_SYMBOL) {
  var c = {
    apiKey: prod().NODE_URL,
    network: t
  }, o = getMemcachedClient();
  try {
    var s = await o.get(getHash(`Wallet_getOnchainTokens:${a}:${t}:${n}:${e}:` + r));
    if (s) return JSON.parse(s.value);
  } catch (e) {
    console.error(e);
  }
  s = new Alchemy(c), c = {
    type: TokenBalanceType.ERC20,
    pageSize: a
  }, n && (c.pageKey = n), s = await s.core.getTokenBalances(e, c), c = s.tokenBalances.map(e => getOnchainTokenMetadata(e.contractAddress, t));
  const i = await Promise.all(c);
  s.tokenBalances = s.tokenBalances.map((e, t) => ({
    ...e,
    metadata: i[t]
  })), s.tokenBalances = s.tokenBalances.filter(e => e.metadata?.symbol);
  try {
    await o.set(getHash(`Wallet_getOnchainTokens:${a}:${t}:${n}:${e}:` + r), JSON.stringify(s), {
      lifetime: 3600
    });
  } catch (e) {
    console.error(e);
  }
  return s;
}

async function getOnchainTransactions(e, t, {
  cursor: a = null,
  category: n = [ "external", "erc20", "erc721", "erc1155" ],
  fromBlock: r = "0x0",
  limit: c = DEFAULT_LIMIT
}) {
  var o = {
    apiKey: prod().NODE_URL,
    network: t
  }, s = getMemcachedClient();
  try {
    var i = await s.get(getHash(`Wallet_getOnchainTransactions:${c}:${t}:${a}:` + e));
    if (i) return JSON.parse(i.value);
  } catch (e) {
    console.error(e);
  }
  i = new Alchemy(o), o = {
    fromBlock: r,
    toAddress: e,
    excludeZeroValue: !0,
    category: n,
    limit: c
  }, a && (o.pageKey = a), r = await i.core.getAssetTransfers(o);
  try {
    await s.set(getHash(`Wallet_getOnchainTransactions:${c}:${t}:${a}:` + e), JSON.stringify(r), {
      lifetime: 3600
    });
  } catch (e) {
    console.error(e);
  }
  return r;
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
  DEFAULT_FILTER_NO_SYMBOL: DEFAULT_FILTER_NO_SYMBOL
};
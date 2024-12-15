const ethers = require("ethers"), BondingErc20History = require("../models/token/BondingErc20History")["BondingErc20History"], BondingErc20Transaction = require("../models/token/BondingErc20Transaction")["BondingErc20Transaction"], padWithZeros = require("./number")["padWithZeros"], getFarcasterUserByAnyAddress = require("./farcaster")["getFarcasterUserByAnyAddress"], {
  Alchemy,
  Network
} = require("alchemy-sdk"), BondingErc20 = require("../models/token/BondingErc20")["BondingErc20"], {
  memcache,
  getHash
} = require("../connectmemcache"), uniswapV3Abi = require("../helpers/abi/uniswap-v3")["uniswapV3Abi"], A = ethers.BigNumber.from("1060848709"), B = ethers.BigNumber.from("4379701787"), DECIMALS = ethers.BigNumber.from("1000000000000000000"), MAX_SUPPLY = ethers.utils.parseEther("799000000"), MAX_PRIMARY_SUPPLY = ethers.BigNumber.from("799000000000000000000000000"), MAX_TOTAL_SUPPLY = ethers.BigNumber.from("1000000000000000000000000000"), BLOCK_TIME_CACHE_KEY = "latest_block_stats", BLOCK_TIME_UPDATE_INTERVAL = 36e5, BLOCKS_TO_SAMPLE = 100;

function calculateMarketCap(e) {
  e = ethers.BigNumber.isBigNumber(e) ? e : ethers.BigNumber.from(e.toString()), 
  e = B.mul(e).div(DECIMALS).toString() / Number(DECIMALS.toString()), e = Math.exp(e), 
  e = Number(A.toString()) / 1e9 * e;
  return ethers.utils.parseEther(e.toString());
}

async function updateBlockTimeStats() {
  var e = await getProvider(), t = await e.getBlock("latest"), e = await e.getBlock(t.number - BLOCKS_TO_SAMPLE), r = t.timestamp - e.timestamp, e = t.number - e.number, t = {
    latestBlockNumber: t.number,
    latestBlockTime: t.timestamp,
    avgBlockTime: r / e,
    lastUpdate: Date.now()
  };
  return await memcache.set(BLOCK_TIME_CACHE_KEY, JSON.stringify(t), {
    lifetime: 7200
  }), t;
}

async function getBlockTimestamp(e) {
  await getProvider();
  var t = "getBlockTimestamp_" + e, r = await memcache.get(t);
  if (r) return new Date(1e3 * parseInt(r.value));
  let a = await memcache.get(BLOCK_TIME_CACHE_KEY);
  (!a || Date.now() - JSON.parse(a.value).lastUpdate > BLOCK_TIME_UPDATE_INTERVAL) && (a = {
    value: JSON.stringify(await updateBlockTimeStats())
  });
  r = (a = JSON.parse(a.value)).latestBlockNumber - e, e = Math.floor(a.latestBlockTime - r * a.avgBlockTime);
  return await memcache.set(t, e.toString()), new Date(1e3 * e);
}

function getBondingCurveProgress(e) {
  return (ethers.BigNumber.from(e).mul(1e4).div(MAX_PRIMARY_SUPPLY).toNumber() / 100).toFixed(2);
}

let _GLOBAL_PROVIDER = null;

const getProvider = async () => {
  var e;
  return _GLOBAL_PROVIDER || (e = {
    apiKey: process.env.BASE_NODE_URL,
    network: Network.BASE_MAINNET
  }, e = await new Alchemy(e).config.getProvider(), _GLOBAL_PROVIDER = e);
}, normalizeEventName = e => [ "WowTokenBuy", "FarTokenBuy" ].includes(e) ? "Buy" : [ "WowTokenSell", "FarTokenSell" ].includes(e) ? "Sell" : e;

async function processFarTokenTradeEvent({
  tokenAddress: e,
  event: t,
  eventName: r,
  decodedLog: a,
  verbose: o = !1,
  blockTimestamp: n = null
}) {
  var s, {
    buyer: a,
    seller: i,
    totalEth: l = "0",
    buyerTokenBalance: c = "0",
    sellerTokenBalance: m = "0",
    totalSupply: u = "0",
    marketType: d,
    recipient: g,
    tokensBought: p = "0",
    tokensSold: k = "0"
  } = a.args;
  if (1 === d) return o && console.log(`Skipping trade for ${e} with total supply ${u} - graduated`), 
  {
    marketCapInETH: null,
    totalSupply: null
  };
  s = calculateMarketCap(u.toString()), o && console.log("Market cap calculation:", {
    totalSupply: u.toString(),
    marketCapInETH: s.toString(),
    tokenAddress: e
  }), o && console.log(`${r}: ${t.transactionHash} - ${l.toString()} ETH`);
  var o = [ "WowTokenBuy", "FarTokenBuy" ].includes(r), e = e.toLowerCase(), l = padWithZeros(l.toString()), p = padWithZeros((o ? p : k)?.toString?.() || "0"), k = {
    tokenAddress: e,
    timestamp: n || await getBlockTimestamp(t.blockNumber),
    blockNumber: "string" == typeof t.blockNumber ? parseInt(t.blockNumber, 16) : Number(t.blockNumber),
    txHash: t.transactionHash,
    eventName: normalizeEventName(r),
    from: o ? ethers.constants.AddressZero : i,
    to: o ? a : ethers.constants.AddressZero,
    recipient: g,
    amountInETH: l,
    tokenAmount: p,
    fromBalance: m.toString(),
    toBalance: c.toString(),
    totalSupply: u.toString(),
    marketType: d,
    marketCapInETH: s.toString()
  }, d = {
    tokenAddress: e,
    timestamp: n || await getBlockTimestamp(t.blockNumber),
    blockNumber: "string" == typeof t.blockNumber ? parseInt(t.blockNumber, 16) : Number(t.blockNumber),
    txHash: t.transactionHash,
    type: normalizeEventName(r),
    from: o ? ethers.constants.AddressZero : i,
    to: o ? a : ethers.constants.AddressZero,
    address: g.toLowerCase(),
    addressBalance: (o ? c : m).toString(),
    tokenAmount: p,
    amountInETH: l,
    totalSupply: u.toString()
  }, [ n, r ] = await Promise.all([ BondingErc20History.findOne({
    txHash: t.transactionHash
  }), BondingErc20Transaction.findOne({
    txHash: t.transactionHash
  }) ]), i = [], a = [];
  return n || (i.push(BondingErc20History.create(k)), g = getHash(`getBondingTokenHistory:${e}:5m`), 
  a.push(memcache.delete(g, {
    noreply: !0
  }))), r || (i.push(BondingErc20Transaction.create(d)), o = getHash(`getBondingTokenTransactions:${e}:10:initial`), 
  c = getHash("getBondingTokens:initial:lastActivity"), m = getHash("getBondingTokens:initial:timestamp"), 
  a.push(memcache.delete(o, {
    noreply: !0
  }), memcache.delete(c, {
    noreply: !0
  }), memcache.delete(m, {
    noreply: !0
  }))), await Promise.all(i), await Promise.all(a), {
    marketCapInETH: s,
    totalSupply: u
  };
}

async function processFarTokenTransferEvent({
  tokenAddress: e,
  event: t,
  decodedLog: r,
  verbose: a = !1,
  blockTimestamp: o = null
}) {
  var {
    from: r,
    to: n,
    fromTokenBalance: s,
    toTokenBalance: i,
    amount: l,
    totalSupply: c
  } = r.args;
  if (ethers.BigNumber.from(c).lt(MAX_SUPPLY)) return a && console.log(`Skipping transfer for ${e} with total supply ${c} - not graduated`), 
  {
    address: null,
    balance: null
  };
  let m;
  try {
    var u = calculateMarketCap(c), d = calculateMarketCap(ethers.BigNumber.from(c).sub(l));
    m = u.sub(d);
  } catch (e) {
    console.error("Error calculating ETH value for transfer:", e), m = ethers.constants.Zero;
  }
  var u = r == ethers.constants.AddressZero, d = n == ethers.constants.AddressZero, g = u ? n : r, s = u ? i : s, p = "0" == s, e = e.toLowerCase(), o = {
    tokenAddress: e,
    timestamp: o || await getBlockTimestamp(t.blockNumber),
    blockNumber: "string" == typeof t.blockNumber ? parseInt(t.blockNumber, 16) : Number(t.blockNumber),
    txHash: t.transactionHash,
    type: u ? "Buy" : d ? "Sell" : "Transfer",
    from: r.toLowerCase(),
    to: n.toLowerCase(),
    address: g.toLowerCase(),
    addressBalance: p ? "0" : padWithZeros(s.toString()),
    tokenAmount: padWithZeros(l.toString()),
    amountInETH: padWithZeros(m.toString()),
    totalSupply: c.toString()
  };
  return await BondingErc20Transaction.findOne({
    txHash: t.transactionHash
  }) ? a && console.log("Skipping duplicate transaction: " + t.transactionHash) : (await BondingErc20Transaction.create(o), 
  u = getHash(`getBondingTokenTransactions:${e}:10:initial`), d = getHash("getBondingTokens:initial:lastActivity"), 
  r = getHash("getBondingTokens:initial:timestamp"), await Promise.all([ memcache.delete(u, {
    noreply: !0
  }), memcache.delete(d, {
    noreply: !0
  }), memcache.delete(r, {
    noreply: !0
  }) ]), a && (console.log("Created transaction record for transfer: " + t.transactionHash), 
  console.log(`Stats for transfer ${t.transactionHash}:`), console.log("  Address: " + g), 
  console.log(`  Address Balance: ${ethers.utils.formatEther(s)} tokens`), console.log(`  Transfer Amount: ${ethers.utils.formatEther(l)} tokens`), 
  console.log(`  Value in ETH: ${ethers.utils.formatEther(m)} ETH`))), {
    address: g,
    balance: i
  };
}

async function getTokenHolders(e, {
  limit: t = 10,
  offset: r = 0
} = {}) {
  var e = e.toLowerCase(), a = getHash(`getTokenHolders:${e}:${t}:` + r), o = await memcache.get(a);
  if (o) return JSON.parse(o.value);
  var [ o ] = await BondingErc20Transaction.aggregate([ {
    $match: {
      tokenAddress: e
    }
  }, {
    $sort: {
      timestamp: -1,
      addressBalance: -1
    }
  }, {
    $group: {
      _id: "$address",
      balance: {
        $first: "$addressBalance"
      },
      lastUpdate: {
        $first: "$timestamp"
      }
    }
  }, {
    $addFields: {
      numericBalance: {
        $convert: {
          input: "$balance",
          to: "decimal",
          onError: 0,
          onNull: 0
        }
      }
    }
  }, {
    $match: {
      numericBalance: {
        $gt: 0
      }
    }
  }, {
    $facet: {
      holders: [ {
        $sort: {
          numericBalance: -1
        }
      }, {
        $skip: Number(r)
      }, {
        $limit: Number(t)
      } ],
      totalCount: [ {
        $count: "count"
      } ]
    }
  } ]), e = o.holders || [], o = o.totalCount[0]?.count || 0, n = e.map(e => e._id.toLowerCase());
  const s = await Promise.all(n.map(e => getFarcasterUserByAnyAddress(e))), i = n.reduce((e, t, r) => (e[t] = s[r], 
  e), {});
  n = e.map(e => {
    var t = ethers.BigNumber.from(e.balance.replace(/^0+/, "") || "0");
    return {
      address: e._id,
      user: i[e._id.toLowerCase()],
      balance: e.balance.replace(/^0+/, ""),
      balanceFormatted: ethers.utils.formatEther(t),
      percentage: (t.mul(ethers.BigNumber.from("10000")).div(MAX_SUPPLY).toNumber() / 100).toFixed(2),
      lastUpdate: e.lastUpdate
    };
  }), e = {
    holders: n,
    stats: {
      holdersCount: o
    },
    pagination: {
      limit: Number(t),
      offset: Number(r),
      hasMore: n.length === t
    }
  };
  return await memcache.set(a, JSON.stringify(e), {
    lifetime: 30
  }), e;
}

async function processFarTokenGraduatedEvent({
  tokenAddress: e,
  event: t
}) {
  return await BondingErc20.findOneAndUpdate({
    tokenAddress: e
  }, {
    marketType: 1,
    lastProcessedBlock: t.blockNumber
  });
}

const getAddressTokens = async (e, {
  ignoreSmallValues: t = !0
} = {}) => {
  e = e.toLowerCase(), e = await BondingErc20Transaction.aggregate([ {
    $match: {
      address: e,
      ...t ? {
        addressBalance: {
          $ne: "0"
        }
      } : {}
    }
  }, {
    $sort: {
      timestamp: -1
    }
  }, {
    $group: {
      _id: "$tokenAddress",
      tokenAddress: {
        $first: "$tokenAddress"
      },
      balance: {
        $first: "$addressBalance"
      },
      totalSupply: {
        $first: "$totalSupply"
      },
      lastActivityAt: {
        $first: "$timestamp"
      }
    }
  } ]);
  const r = (await BondingErc20.find({
    tokenAddress: {
      $in: e.map(e => e.tokenAddress)
    }
  })).reduce((e, t) => (e[t.tokenAddress] = t, e), {});
  return {
    tokens: e.map(e => {
      var t = r[e.tokenAddress];
      return t ? {
        ...t.toObject(),
        balance: e.balance,
        totalSupply: e.totalSupply?.replace(/^0+/, "") || "0",
        lastActivityAt: e.lastActivityAt
      } : null;
    }).filter(Boolean),
    pagination: null
  };
};

function getPricePerToken(e) {
  var e = ethers.BigNumber.isBigNumber(e) ? e : ethers.BigNumber.from(e.toString()), t = e, e = e.add(ethers.constants.WeiPerEther), t = B.mul(t).div(DECIMALS), t = Math.exp(t.toString() / Number(DECIMALS.toString())), e = B.mul(e).div(DECIMALS), e = ((Math.exp(e.toString() / Number(DECIMALS.toString())) - t) * (Number(A.toString()) / Number(B.toString()))).toFixed(18).replace(/\.?0+$/, "");
  return ethers.utils.parseEther(e);
}

const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

async function calculateUniswapMarketCap(t, r, a) {
  var o = getHash(`uniswap_market_cap:${t}:${r.toString()}:` + a), e = await memcache.get(o);
  if (e) return e.value;
  try {
    var n = await getProvider(), s = new ethers.Contract(t, uniswapV3Abi, n), i = WETH_ADDRESS < a ? WETH_ADDRESS : a, l = i === WETH_ADDRESS;
    if (!i) return console.error("Token not found in pool"), "0";
    var c = await s.slot0(), m = ethers.BigNumber.from(c.sqrtPriceX96);
    if (m.isZero()) return console.error("Invalid sqrtPriceX96: 0"), "0";
    var u = ethers.BigNumber.from(2).pow(96), d = m.mul(m), g = ethers.BigNumber.from(10).pow(18);
    let e = d.mul(g).div(u).div(u);
    l || (e = g.mul(g).div(e));
    var p = (ethers.BigNumber.isBigNumber(r) ? r : ethers.BigNumber.from(r.toString())).mul(g).div(e);
    return await memcache.set(o, p.toString(), {
      lifetime: 60
    }), p.toString();
  } catch (e) {
    return console.error("Error calculating Uniswap market cap:", e), console.error({
      poolAddress: t,
      amount: r.toString(),
      tokenAddress: a,
      error: e.message
    }), "0";
  }
}

async function calculateMarketCapWithUniswap(e, t, r, a) {
  t = ethers.BigNumber.isBigNumber(t) ? t : ethers.BigNumber.from(t.toString());
  if (1 !== e) return calculateMarketCap(t);
  if (!r) throw new Error("Pool address is required for Uniswap market cap calculation");
  if (a) return calculateUniswapMarketCap(r, t, a);
  throw new Error("Token address is required for Uniswap market cap calculation");
}

module.exports = {
  processFarTokenTradeEvent: processFarTokenTradeEvent,
  processFarTokenTransferEvent: processFarTokenTransferEvent,
  calculateMarketCap: calculateMarketCap,
  getBondingCurveProgress: getBondingCurveProgress,
  getTokenHolders: getTokenHolders,
  processFarTokenGraduatedEvent: processFarTokenGraduatedEvent,
  MAX_SUPPLY: MAX_SUPPLY,
  MAX_PRIMARY_SUPPLY: MAX_PRIMARY_SUPPLY,
  MAX_TOTAL_SUPPLY: MAX_TOTAL_SUPPLY,
  getAddressTokens: getAddressTokens,
  getPricePerToken: getPricePerToken,
  calculateUniswapMarketCap: calculateUniswapMarketCap,
  calculateMarketCapWithUniswap: calculateMarketCapWithUniswap,
  getBlockTimestamp: getBlockTimestamp
};
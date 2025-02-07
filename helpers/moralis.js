const Moralis = require("moralis").default, ethers = require("ethers")["ethers"], {
  memcache,
  getHash
} = require("../connectmemcache"), {
  BASE_DEX_CONTRACTS,
  BASE_DEX_CONTRACTS_LOWERCASE
} = require("../schemas/farcaster/analytics"), NETWORK = {
  ETH: {
    moralisChain: "eth",
    chainId: "0x1",
    dbChain: "ETH"
  },
  BASE: {
    moralisChain: "base",
    chainId: "0x2105",
    dbChain: "BASE"
  },
  OP: {
    moralisChain: "optimism",
    chainId: "0xa",
    dbChain: "OP"
  }
}, WETH_CONTRACT = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", initMoralis = async () => {
  Moralis.Core.isStarted || await Moralis.start({
    apiKey: process.env.MORALIS_API_KEY
  });
}, withCache = async (e, a, t) => {
  var e = getHash(e), r = await memcache.get(e);
  return r ? JSON.parse(r.value) : (r = await t(), await memcache.set(e, JSON.stringify(r), {
    lifetime: a
  }), r);
}, formatChainId = e => "string" == typeof e && e.startsWith("0x") ? e : "0x" + Number(e).toString(16), buildPnlLookupMap = e => e ? new Map(e.map(e => [ e.token_address.toLowerCase(), e ])) : new Map(), decorateTransactionWithPnlHistory = (e, a) => {
  if (!a || !e) return e;
  const s = buildPnlLookupMap(a);
  return e.map(e => {
    if ("token swap" === e.category && e.summary) {
      var a = e.erc20Transfers?.[0];
      if (!a) return e;
      var t = a.address?.toLowerCase();
      if (!t) return e;
      var r, t = s.get(t);
      if (t) return r = e.summary?.includes(" for ") && e.summary?.split(" for ")[1].includes("ETH"), 
      {
        ...e,
        total_pnl: t.realized_profit_usd,
        swap_pnl: parseFloat(a.value_formatted) * (r ? t.avg_sell_price_usd - t.avg_buy_price_usd : t.avg_buy_price_usd - t.avg_sell_price_usd),
        avg_buy_price: t.avg_buy_price_usd,
        avg_sell_price: t.avg_sell_price_usd
      };
    }
    return e;
  });
}, decorateTransfersWithPnlHistory = (e, a) => {
  if (!a || !e) return e;
  const t = buildPnlLookupMap(a);
  return e.map(e => {
    var a = e.address?.toLowerCase();
    return (a = a && t.get(a)) ? {
      ...e,
      total_pnl: a.realized_profit_usd,
      transfer_pnl: parseFloat(e.tokenAmount) * (e.isSell ? a.avg_sell_price_usd - a.avg_buy_price_usd : a.avg_buy_price_usd - a.avg_sell_price_usd),
      avg_buy_price: a.avg_buy_price_usd,
      avg_sell_price: a.avg_sell_price_usd
    } : e;
  });
}, cleanTransaction = (e, a) => {
  var t, r, s;
  return e ? (t = e.from_address?.toLowerCase(), r = e.to_address?.toLowerCase(), 
  s = ethers.constants.AddressZero.toLowerCase(), t = BASE_DEX_CONTRACTS_LOWERCASE[t] || t === s, 
  r = BASE_DEX_CONTRACTS_LOWERCASE[r] || r === s, s = a && e.from_address !== a.toLowerCase(), 
  {
    ...e,
    timestamp: e.block_timestamp,
    from: e.from_address,
    to: e.to_address,
    tokenAmount: e.value_decimal,
    valueSymbol: e.token_symbol,
    txHash: e.transaction_hash,
    hash: e.transaction_hash,
    address: e.address,
    blockNumber: e.block_number,
    logIndex: e.log_index,
    fromEntity: {
      name: e.from_address_entity,
      logo: e.from_address_entity_logo,
      label: e.from_address_label
    },
    toEntity: {
      name: e.to_address_entity,
      logo: e.to_address_entity_logo,
      label: e.to_address_label
    },
    token: {
      name: e.token_name,
      symbol: e.token_symbol,
      logo: e.token_logo,
      decimals: e.token_decimals,
      address: e.address,
      possible_spam: e.possible_spam
    },
    type: r ? "Sell" : t ? "Buy" : s ? "Airdrop" : "Swap",
    isSell: r,
    isBuy: t
  }) : null;
}, getWalletHistory = async (a, t, r, s, {
  nftMetadata: o = !1,
  includeInternalTransactions: n = !1,
  categoryFilter: i = null
} = {}) => (await initMoralis(), withCache(`moralis:history:${a}:${r}:${s || "initial"}:` + (i || "all"), 30, async () => {
  var e = {
    address: a,
    chain: t,
    limit: r
  }, e = (s && (e.cursor = s), o && (e.nftMetadata = o), n && (e.includeInternalTransactions = n), 
  await Moralis.EvmApi.wallets.getWalletHistory(e)), e = {
    ...e.toJSON(),
    result: e.result.map(e => ({
      ...e.toJSON(),
      erc20Transfers: e.erc20Transfers?.map(e => e.toJSON())
    }))
  };
  return i && e.result ? {
    ...e,
    result: e.result.filter(e => e.category === i)
  } : e;
})), getNativeBalance = async (e, a) => (await initMoralis(), withCache("moralis:balance:" + e, 30, async () => {
  return (await Moralis.EvmApi.balance.getNativeBalance({
    address: e,
    chain: a
  })).toJSON();
})), decorateTokenWithPnlHistory = (e, a) => {
  if (!a || !e) return e;
  const o = buildPnlLookupMap(a);
  return e.map(e => {
    var a, t, r, s = e.token_address?.toLowerCase();
    return (s = s && o.get(s)) ? (r = parseFloat(e.balance_formatted) || 0, a = parseFloat(e.usd_price) || 0, 
    t = parseFloat(s.avg_buy_price_usd) || 0, r = r && a && t ? r * (a - t) : 0, 
    {
      ...e,
      ...s,
      total_pnl: s.realized_profit_usd,
      avg_buy_price: s.avg_buy_price_usd,
      avg_sell_price: s.avg_sell_price_usd,
      unrealized_pnl: r
    }) : e;
  });
}, getTokenBalances = async (a, e, t = !0) => {
  await initMoralis();
  const r = formatChainId(e);
  return withCache(`moralis:tokens:${a}:` + t, 30, async () => {
    try {
      let e = (await Moralis.EvmApi.wallets.getWalletTokenBalancesPrice({
        address: a,
        chain: r
      })).result.map(e => {
        var a, t = {
          ...e.toJSON()
        };
        return e.usdPrice ? (a = ethers.utils.formatUnits(e.totalSupply || "0", e.decimals || 18), 
        t.market_cap_usd = e.usdPrice * parseFloat(a)) : t.market_cap_usd = null, 
        t;
      }) || [];
      return (e = t ? e.filter(e => 1 <= parseFloat(e.usd_value)) : e).sort((e, a) => a.usd_value - e.usd_value), 
      e;
    } catch (e) {
      return console.error("Error fetching token balances:", e.message, e.stack), 
      [];
    }
  });
}, getWalletNetWorth = async e => (await initMoralis(), withCache("moralis:networth:" + e, 30, async () => {
  try {
    return (await Moralis.EvmApi.wallets.getWalletNetWorth({
      address: e,
      excludeSpam: !0,
      excludeUnverifiedContracts: !0
    })).raw;
  } catch (e) {
    return console.error("Error fetching wallet net worth:", e.message, e.stack), 
    {
      total_usd: 0
    };
  }
})), getPnLHistory = async (e, a, t = "all") => {
  await initMoralis();
  const r = formatChainId(a);
  return withCache(`moralis:pnl:${e}:` + t, 3600, async () => {
    try {
      return (await Moralis.EvmApi.wallets.getWalletProfitability({
        address: e,
        chain: r,
        days: t
      })).raw.result || [];
    } catch (e) {
      return console.error("Error fetching PnL history:", e.message, e.stack), [];
    }
  });
}, getWalletTokenStats = async (e, a, t = "7") => {
  await initMoralis();
  const r = formatChainId(a);
  return withCache(`moralis:tokenstats:${e}:` + t, 3600, async () => {
    try {
      return {
        summary: (await Moralis.EvmApi.wallets.getWalletProfitabilitySummary({
          address: e,
          chain: r,
          days: t
        })).raw
      };
    } catch (e) {
      return console.error("Error fetching wallet token stats:", e.message, e.stack), 
      {
        summary: {
          total_realized_profit_usd: "0",
          total_realized_profit_percentage: "0",
          total_trade_volume: "0",
          total_count_of_trades: "0"
        }
      };
    }
  });
}, getMultipleTokenPrices = async (e, a) => {
  await initMoralis();
  const t = formatChainId(e), r = a.filter(e => e.tokenAddress).map(e => {
    var a = {
      tokenAddress: e.tokenAddress
    };
    return e.exchange && (a.exchange = a.exchange.toLowerCase()), e.toBlock && (a.toBlock = e.toBlock), 
    a;
  });
  e = r.sort((e, a) => e.tokenAddress.localeCompare(a.tokenAddress)).map(e => `${e.tokenAddress}:${e.exchange}:` + e.toBlock).join(","), 
  a = `moralis:prices:${t}:` + e;
  return withCache(a, 30, async () => {
    try {
      return (await Moralis.EvmApi.token.getMultipleTokenPrices({
        chain: t,
        include: "percent_change"
      }, {
        tokens: r
      })).raw;
    } catch (e) {
      return console.error("Error fetching token prices:", e.message, e.stack), 
      [];
    }
  });
}, getTokenPrice = async (e, a) => {
  await initMoralis();
  const t = formatChainId(e);
  return withCache(`moralis:price:${t}:` + a, 30, async () => {
    try {
      return (await Moralis.EvmApi.token.getTokenPrice({
        chain: t,
        include: "percent_change",
        address: a
      })).raw;
    } catch (e) {
      return console.error("Error fetching token price:", e.message, e.stack), null;
    }
  });
}, getTokenMetadata = async (e, a) => {
  await initMoralis();
  const t = formatChainId(e);
  if (a.some(e => !e)) throw new Error("Null address is not allowed!");
  return 0 === a.length ? [] : (e = [ ...a ].sort().join(","), e = `moralis:metadata:${t}:` + e, 
  withCache(e, 300, async () => {
    try {
      return (await Moralis.EvmApi.token.getTokenMetadata({
        chain: t,
        addresses: a
      })).raw;
    } catch (e) {
      return console.error("Error fetching token metadata:", e.message, e.stack), 
      [];
    }
  }));
}, getTokenOwners = async (e, a, {
  limit: t = 100,
  cursor: r = null
} = {}) => {
  await initMoralis();
  const s = formatChainId(e);
  return withCache(`moralis:token:owners:${s}:${a}:${t}:` + (r || "initial"), 30, async () => {
    try {
      var e = {
        chain: s,
        tokenAddress: a,
        limit: t,
        order: "DESC"
      };
      return r && (e.cursor = r), (await Moralis.EvmApi.token.getTokenOwners(e)).toJSON();
    } catch (e) {
      return console.error("Error fetching token owners:", e.message, e.stack), 
      [];
    }
  });
}, getTokenTransfers = async (e, t, {
  limit: r = 100,
  cursor: s = null
} = {}) => {
  await initMoralis();
  const o = formatChainId(e);
  return withCache(`moralis:token:transfers:${o}:${t}:${r}:` + (s || "initial"), 30, async () => {
    try {
      var e = {
        chain: o,
        address: t,
        limit: r,
        order: "DESC"
      }, a = (s && (e.cursor = s), await Moralis.EvmApi.token.getTokenTransfers(e));
      return a.raw;
    } catch (e) {
      return console.error("Error fetching token transfers:", e.message, e.stack), 
      [];
    }
  });
}, getWalletTokenTransfers = async (e, t, {
  limit: r = 100,
  cursor: s = null
} = {}) => {
  await initMoralis();
  const o = formatChainId(e);
  return withCache(`moralis:wallet:token:transfers:${o}:${t}:${r}:` + (s || "initial"), 30, async () => {
    try {
      var e = {
        chain: o,
        address: t,
        limit: r,
        order: "DESC"
      }, a = (s && (e.cursor = s), await Moralis.EvmApi.token.getWalletTokenTransfers(e));
      return a.raw;
    } catch (e) {
      return console.error("Error fetching wallet token transfers:", e.message, e.stack), 
      {
        result: [],
        cursor: null
      };
    }
  });
}, decorateTransactionPrice = async (e, a) => {
  if (!e || !e.length) return e;
  var t = e.map(e => ({
    tokenAddress: e.token?.address || e.address,
    toBlock: e.blockNumber
  })).filter(e => e.tokenAddress);
  if (!t.length) return e;
  a = await getMultipleTokenPrices(a, t);
  const d = new Map(a.map(e => [ e.tokenAddress.toLowerCase(), e ]));
  return e.map(e => {
    var a, t, r, s, o, n, i, l, c = e.token?.address?.toLowerCase();
    return (c = c && d.get(c)) ? (a = parseInt(e.token.decimals || c.tokenDecimals), 
    t = e.value || e.tokenAmount, t = ethers.BigNumber.from(t.includes(".") ? ethers.utils.parseUnits(t, a).toString() : t), 
    r = parseFloat(c.usdPrice || "0"), s = parseFloat(ethers.utils.formatUnits(t, a)) * r, 
    o = c.nativePrice?.value ? ethers.BigNumber.from(c.nativePrice.value) : ethers.BigNumber.from(0), 
    n = c.nativePrice?.decimals || 18, i = t.mul(o).div(ethers.BigNumber.from(10).pow(a)), 
    l = ethers.utils.formatUnits(t, a), {
      ...e,
      price: {
        usd: r,
        usd_formatted: c.usdPriceFormatted,
        token_decimals: a,
        exchange: c.exchangeName,
        pair_liquidity_usd: c.pairTotalLiquidityUsd,
        percent_change_24h: c["24hrPercentChange"],
        native: c.nativePrice ? {
          ...c.nativePrice,
          value: o.toString()
        } : null
      },
      value_usd: s,
      value_usd_formatted: s.toFixed(2),
      txAmount: {
        token: l,
        token_formatted: parseFloat(l).toFixed(4),
        token_raw: t.toString(),
        usd: s,
        usd_formatted: s.toFixed(2),
        native: i.toString(),
        native_formatted: ethers.utils.formatUnits(i, n),
        native_symbol: c.nativePrice?.symbol || "ETH"
      }
    }) : e;
  });
}, decorateTransactionsPrices = async (e, a) => Array.isArray(e) ? decorateTransactionPrice(e, a) : decorateTransactionPrice([ e ], a).then(e => e[0]), cleanTokenToMoralis = e => {
  var a = ethers.BigNumber.from(e.balance.replace(/^0+/, "") || "0"), t = ethers.utils.formatEther(a), r = parseFloat(t) * parseFloat(e.pricePerTokenUSD || 0), s = ethers.utils.formatEther(e.totalSupply), o = (parseFloat(t) / parseFloat(s) * 100).toFixed(2);
  return {
    is_fartoken: e.isFartoken,
    token_address: e.tokenAddress.toLowerCase(),
    name: e.name,
    symbol: e.symbol,
    logo: e.metadata?.image || null,
    thumbnail: e.metadata?.image || null,
    decimals: 18,
    balance: a.toString(),
    possible_spam: !1,
    verified_contract: !0,
    usd_price: parseFloat(e.pricePerTokenUSD || 0),
    usd_price_24hr_percent_change: null,
    usd_price_24hr_usd_change: null,
    usd_value_24hr_usd_change: null,
    usd_value: r,
    portfolio_percentage: null,
    balance_formatted: t,
    native_token: !1,
    total_supply: e.totalSupply,
    total_supply_formatted: s,
    percentage_relative_to_total_supply: o
  };
};

module.exports = {
  initMoralis: initMoralis,
  getMultipleTokenPrices: getMultipleTokenPrices,
  getTokenPrice: getTokenPrice,
  getWalletHistory: getWalletHistory,
  getNativeBalance: getNativeBalance,
  getTokenBalances: getTokenBalances,
  getWalletNetWorth: getWalletNetWorth,
  getPnLHistory: getPnLHistory,
  getWalletTokenStats: getWalletTokenStats,
  decorateTransactionWithPnlHistory: decorateTransactionWithPnlHistory,
  decorateTokenWithPnlHistory: decorateTokenWithPnlHistory,
  getTokenMetadata: getTokenMetadata,
  NETWORK: NETWORK,
  WETH_CONTRACT: WETH_CONTRACT,
  getTokenOwners: getTokenOwners,
  getTokenTransfers: getTokenTransfers,
  getWalletTokenTransfers: getWalletTokenTransfers,
  decorateTransfersWithPnlHistory: decorateTransfersWithPnlHistory,
  cleanTransaction: cleanTransaction,
  decorateTransactionPrice: decorateTransactionPrice,
  decorateTransactionsPrices: decorateTransactionsPrices,
  cleanTokenToMoralis: cleanTokenToMoralis
};
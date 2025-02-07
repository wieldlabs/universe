const app = require("express").Router(), Sentry = require("@sentry/node"), BondingErc20 = require("../../models/token/BondingErc20")["BondingErc20"], BondingErc20History = require("../../models/token/BondingErc20History")["BondingErc20History"], BondingErc20Transaction = require("../../models/token/BondingErc20Transaction")["BondingErc20Transaction"], {
  memcache,
  getHash
} = require("../../connectmemcache"), getLimit = require("../apikey")["getLimit"], rateLimit = require("express-rate-limit"), BigNumber = require("ethers")["BigNumber"], {
  oneEthToUsd,
  weiToUsd
} = require("../../helpers/wallet"), {
  calculateMarketCap,
  calculateMarketCapWithUniswap,
  calculateAllocatedMarketCap,
  getBondingCurveProgress,
  getTokenHolders,
  getPricePerToken,
  MAX_TOTAL_SUPPLY
} = require("../../helpers/fartoken"), ethers = require("ethers"), getFarcasterUserByAnyAddress = require("../../helpers/farcaster")["getFarcasterUserByAnyAddress"], {
  getTokenMetadata,
  getTokenPrice,
  getTokenOwners,
  NETWORK,
  getTokenTransfers,
  cleanTransaction,
  decorateTransactionsPrices
} = require("../../helpers/moralis"), Filter = require("bad-words"), Agent = require("../../models/farcaster/agents")["Agent"], filter = new Filter(), BASE_CHAIN_ID = "0x2105", isTokenNSFW = e => e.metadata?.nsfw || filter.isProfane(e.metadata?.name || "") || filter.isProfane(e.metadata?.description || "") || !1, limiter = rateLimit({
  windowMs: 5e3,
  max: getLimit(5),
  message: "Too many requests or invalid API key! See docs.wield.xyz for more info.",
  validate: {
    limit: !1
  }
}), getTimeRangeMs = e => {
  var t = {
    "5m": 3e5,
    "15m": 9e5,
    "1h": 36e5,
    "1d": 864e5,
    "7d": 6048e5
  };
  return t[e] || t["1h"];
}, getIntervalMs = e => {
  var t = {
    "5m": 5e3,
    "15m": 15e3,
    "1h": 6e4,
    "1d": 12e5,
    "7d": 72e5
  };
  return t[e] || t["1h"];
}, cleanIpfsImage = e => {
  return e?.startsWith("ipfs://") ? "https://wieldcd.net/cdn-cgi/image/fit=contain,anim=false,f=auto,w=256/" + encodeURIComponent(e.replace("ipfs://", "https://pinata.wieldcd.net/ipfs/") + ("?pinataGatewayToken=" + process.env.PINATA_GATEWAY_TOKEN)) : e;
}, cleanTokenData = e => {
  return e.data ? {
    data: e.data.map(e => ({
      ...e,
      marketCap: e.marketCap?.replace(/^0+/, "") || "0",
      volume: e.volume?.toString()?.replace(/^0+/, "") || "0",
      totalSupply: e.totalSupply?.toString()?.replace(/^0+/, "") || "0"
    })),
    stats: {
      ...e.stats,
      totalVolume: e.stats.totalVolume?.toString()?.replace(/^0+/, "") || "0"
    }
  } : {
    ...e,
    marketCapInETH: e.marketCapInETH?.toString()?.replace(/^0+/, "") || "0",
    totalSupply: e.totalSupply?.toString()?.replace(/^0+/, "") || "0"
  };
};

function escapeRegExp(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

app.get("/search", async (e, t) => {
  try {
    var a, r, s, n, i = e.query["query"];
    return i ? (a = getHash("searchTokens:" + i), (r = await memcache.get(a)) ? t.json({
      tokens: JSON.parse(r.value)
    }) : (0 < (s = await BondingErc20.aggregate([ {
      $match: {
        name: {
          $regex: new RegExp("^" + escapeRegExp(i), "i")
        },
        type: {
          $in: BondingErc20.queryTokens()
        }
      }
    }, {
      $addFields: {
        nameLength: {
          $strLenCP: "$name"
        }
      }
    }, {
      $sort: {
        nameLength: 1
      }
    }, {
      $limit: 10
    } ])).length && await memcache.set(a, JSON.stringify(s), {
      lifetime: 21600
    }), n = s.map(e => ({
      ...cleanTokenData(e),
      metadata: {
        ...e.metadata,
        image: cleanIpfsImage(e.metadata?.image)
      }
    })), t.json({
      tokens: n
    }))) : t.status(400).json({
      error: "Search query is required"
    });
  } catch (e) {
    return console.error("Failed to search tokens:", e), Sentry.captureException(e), 
    t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/:tokenAddress/metadata", limiter, async (e, t) => {
  var e = e.params["tokenAddress"], e = e.toLowerCase(), a = getHash("tokenAddressMetadata:" + e), r = await memcache.get(a);
  if (r) return t.json(JSON.parse(r.value));
  var [ r ] = await Promise.all([ BondingErc20.findOne({
    tokenAddress: e
  }) ]);
  if (r?.type && !BondingErc20.availableTokens().includes(r.type)) return t.status(403).json({
    error: "Token not available"
  });
  let s = null;
  return s = r ? {
    tokenAddress: e,
    name: r.name,
    symbol: r.symbol,
    metadata: {
      description: r.metadata?.description,
      image: cleanIpfsImage(r.metadata?.image)
    }
  } : {
    tokenAddress: e,
    name: (r = (await getTokenMetadata(NETWORK.BASE.chainId, [ e ]))[0] || {}).name,
    symbol: r.symbol,
    metadata: {
      image: cleanIpfsImage(r.logo)
    }
  }, await memcache.set(a, JSON.stringify(s), {
    lifetime: 86400
  }), t.json(s);
}), app.get("/:tokenAddress", limiter, async (n, i) => {
  try {
    var o = n.params["tokenAddress"];
    const B = o.toLowerCase(), b = "BASE";
    var l = getHash("getBondingToken:" + B), d = await memcache.get(l);
    if (d) return i.json(cleanTokenData(JSON.parse(d.value)));
    var m, c, p, u, g, y, [ k ] = await Promise.all([ BondingErc20.findOne({
      tokenAddress: B
    }) ]), T = async () => {
      var e = (await getTokenOwners(NETWORK[b].chainId, B, {
        limit: 10
      }))?.result || [];
      return Promise.all(e.map(async e => ({
        user: await getFarcasterUserByAnyAddress(e.owner_address.toLowerCase()),
        address: e.owner_address,
        balance: e.balance,
        balanceFormatted: e.balance_formatted,
        percentage: e.percentage_relative_to_total_supply,
        isContract: e.is_contract,
        usdValue: e.usd_value
      })));
    };
    if (k?.type && !BondingErc20.availableTokens().includes(k.type)) return i.status(403).json({
      error: "Token not available"
    });
    if (!k) return [ m, c, p ] = await Promise.all([ getTokenMetadata(NETWORK[b].chainId, [ B ]), getTokenPrice(NETWORK[b].chainId, B), T() ]), 
    u = m[0], g = c || {}, y = {
      isFartoken: !1,
      tokenAddress: B,
      name: u.name,
      symbol: u.symbol,
      decimals: u.decimals,
      totalSupply: u.total_supply,
      marketCapInETH: g.nativePrice?.value || "0",
      marketCapUSD: u.fully_diluted_valuation?.toString() || "0",
      pricePerToken: g.nativePrice?.value || "0",
      pricePerTokenUSD: g.usdPrice?.toString() || "0",
      timestamp: u.created_at,
      marketType: "uniswap",
      metadata: {
        name: u.name || k?.metadata?.name,
        symbol: u.symbol || k?.metadata?.symbol,
        image: u.logo || cleanIpfsImage(k?.metadata?.image),
        description: u.description || k?.metadata?.description,
        links: {
          website: u.website || k?.metadata?.websiteLink,
          twitter: u.twitter || k?.metadata?.twitter,
          discord: u.discord || k?.metadata?.discord,
          telegram: u.telegram || k?.metadata?.telegram
        }
      },
      exchangeInfo: {
        name: g.exchangeName,
        address: g.exchangeAddress,
        pairAddress: g.pairAddress,
        liquidityUSD: g.pairTotalLiquidityUsd
      },
      securityInfo: {
        score: u.security_score,
        verified: u.verified_contract,
        possibleSpam: u.possible_spam
      },
      priceChange24h: g["24hrPercentChange"],
      topHolders: p,
      pairAddress: g.pairAddress,
      pairTotalLiquidityUsd: g.pairTotalLiquidityUsd
    }, await memcache.set(l, JSON.stringify(y), {
      lifetime: 30
    }), i.json(cleanTokenData(y));
    var h = [ 1 === k.marketType ? T() : getTokenHolders(B, {
      limit: 10
    }), BondingErc20Transaction.findOne({
      tokenAddress: B
    }).sort({
      timestamp: -1,
      _id: -1
    }).select("totalSupply"), getFarcasterUserByAnyAddress((k.overrideTokenCreator || k.tokenCreator).toLowerCase()), oneEthToUsd(), Agent.findOne({
      tokenAddress: k.tokenAddress.toLowerCase(),
      type: "CLAN"
    }) ], [ w, f, S, v, A, ...E ] = (1 === k.marketType && h.push(calculateMarketCapWithUniswap(k.marketType, MAX_TOTAL_SUPPLY, k.poolAddress, k.tokenAddress)), 
    await Promise.all(h));
    let e, t, a, r, s = parseInt(BASE_CHAIN_ID);
    var C, I = f?.totalSupply?.replace(/^0+/, "") || "0", U = (t = 0 < E.length ? ([ C ] = E, 
    e = ethers.utils.formatEther(C), weiToUsd(C, v)) : (e = calculateMarketCap(I), 
    weiToUsd(e, v)), "FIDTOKEN" === k.type && (a = calculateAllocatedMarketCap(I, k.allocatedSupply?.replace?.(/^0+/, "") || "0"), 
    r = weiToUsd(a, v), s = 10), getPricePerToken(I)), N = {
      tokenAddress: k.tokenAddress,
      name: k.name,
      symbol: k.symbol,
      decimals: k.decimals,
      totalSupply: I,
      marketCapInETH: e.toString(),
      marketCapUSD: t.toString(),
      pricePerToken: U,
      pricePerTokenUSD: weiToUsd(U, v),
      timestamp: k.timestamp,
      marketType: k.marketType,
      metadata: {
        ...k.metadata,
        nsfw: isTokenNSFW(k),
        image: cleanIpfsImage(k.metadata?.image)
      },
      bondingCurveProgress: getBondingCurveProgress(I?.replace(/^0+/, "") || "0"),
      tokenCreator: k.tokenCreator,
      actualCreator: k.actualCreator,
      tokenCreatorProfile: S,
      topHolders: 1 !== k.marketType ? w.holders : w,
      holdersCount: 1 !== k.marketType ? w.stats.holdersCount : 0,
      isFartoken: !0,
      type: k.type,
      adjustedMarketCapInETH: a?.toString(),
      adjustedMarketCapUSD: r?.toString(),
      chainId: s,
      agentId: A?._id,
      tipWrapperAddress: A?.tipWrapperAddress
    };
    return await memcache.set(l, JSON.stringify(N), {
      lifetime: 30
    }), i.json(cleanTokenData(N));
  } catch (e) {
    return Sentry.captureException(e), console.error(e), i.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/:tokenAddress/holders", limiter, async (e, t) => {
  try {
    var a, r = e.params["tokenAddress"], {
      limit: s = 10,
      offset: n = 0
    } = e.query, i = r.toLowerCase(), o = getHash(`getBondingTokenHolders:${i}:${s}:` + n), l = await memcache.get(o);
    return l ? t.json(JSON.parse(l.value)) : (a = await getTokenHolders(i, {
      limit: Number(s),
      offset: Number(n)
    }), await memcache.set(o, JSON.stringify(a), {
      lifetime: 30
    }), t.json(a));
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/:tokenAddress/transactions", limiter, async (t, a) => {
  try {
    var r = t.params["tokenAddress"], {
      limit: s = 20,
      cursor: n = null
    } = t.query;
    const h = r.toLowerCase();
    var i, o, l, [ d, m ] = n ? n.split("-") : [ null, null ], c = getHash(`getBondingTokenTransactions:${h}:${s}:` + (n || "initial")), p = await memcache.get(c);
    if (p) return a.json(JSON.parse(p.value));
    const w = await BondingErc20.findOne({
      tokenAddress: h
    });
    if (w?.type && !BondingErc20.availableTokens().includes(w.type)) return a.status(403).json({
      error: "Token not available"
    });
    if (!w || 1 === w.marketType) return (i = await getTokenTransfers(NETWORK.BASE.chainId, h, {
      limit: Number(s),
      cursor: n
    }))?.result ? (o = await Promise.all(i.result.map(async e => {
      var t = e.from_address.toLowerCase() === h.toLowerCase() ? e.to_address : e.from_address, t = await getFarcasterUserByAnyAddress(t.toLowerCase());
      return {
        ...cleanTransaction(e),
        user: t
      };
    })), l = {
      transactions: await decorateTransactionsPrices(o, NETWORK.BASE.chainId),
      isFartoken: !1,
      pagination: {
        limit: Number(s),
        cursor: i.cursor
      }
    }, await memcache.set(c, JSON.stringify(l), {
      lifetime: 30
    }), a.json(l)) : a.json({
      transactions: [],
      isFartoken: !1,
      pagination: {
        limit: Number(s),
        cursor: n
      }
    });
    var u = {
      tokenAddress: h
    }, g = (d && m && (u.$or = [ {
      timestamp: {
        $lt: new Date(parseInt(d))
      }
    }, {
      timestamp: new Date(parseInt(d)),
      _id: {
        $lt: m
      }
    } ]), await BondingErc20Transaction.find(u).sort({
      timestamp: -1,
      _id: -1
    }).limit(Number(s)).select({
      type: 1,
      timestamp: 1,
      from: 1,
      to: 1,
      tokenAmount: 1,
      amountInETH: 1,
      txHash: 1,
      address: 1
    }));
    const f = await oneEthToUsd();
    var y, k = await Promise.all(g.map(async e => ({
      isFartoken: !0,
      valueSymbol: w.symbol,
      type: e.type,
      timestamp: e.timestamp,
      from: e.from,
      to: e.to,
      address: e.address,
      tokenAmount: ethers.utils.formatEther(e.tokenAmount.replace(/^0+/, "") || "0"),
      token: {
        symbol: w.symbol,
        logo: cleanIpfsImage(w.metadata?.image),
        address: w.tokenAddress,
        name: w.name,
        decimals: 18
      },
      txAmount: {
        usd: e.amountInETH ? weiToUsd(e.amountInETH.replace(/^0+/, "") || "0", f) : null,
        native_formatted: e.amountInETH ? ethers.utils.formatUnits(e.amountInETH.replace(/^0+/, "") || "0", 18) : null,
        native_symbol: "ETH"
      },
      txHash: e.txHash,
      user: e.address ? await getFarcasterUserByAnyAddress(e.address.toLowerCase()) : null
    })));
    let e = null;
    g.length === Number(s) && (y = g[g.length - 1], e = new Date(y.timestamp).getTime() + "-" + y._id);
    var T = {
      transactions: k,
      isFartoken: !0,
      pagination: {
        limit: Number(s),
        cursor: e
      }
    };
    return n ? await memcache.set(c, JSON.stringify(T), {
      lifetime: 30
    }) : await memcache.set(c, JSON.stringify(T)), a.json(T);
  } catch (e) {
    return Sentry.captureException(e), console.error(e), a.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/:tokenAddress/history", limiter, async (e, t) => {
  try {
    var a, r = e.params["tokenAddress"], {
      timerange: s = "1h"
    } = e.query, m = r.toLowerCase(), [ c ] = await Promise.all([ BondingErc20.findOne({
      tokenAddress: m
    }) ]);
    if (c?.type && !BondingErc20.availableTokens().includes(c.type)) return t.status(403).json({
      error: "Token not available"
    });
    if (!c || 1 === c.marketType) return (a = await getTokenPrice(NETWORK.BASE.chainId, m)) ? t.json({
      data: [],
      isFartoken: !1,
      stats: {
        ...a,
        pairAddress: a.pairAddress,
        pairTotalLiquidityUsd: a.pairTotalLiquidityUsd
      }
    }) : t.json({
      data: [],
      isFartoken: !1,
      error: "No price data available"
    });
    var p = getHash(`getBondingTokenHistory:${m}:` + s), u = await memcache.get(p);
    if (u) return t.json(JSON.parse(u.value));
    var g = getTimeRangeMs(s), y = getIntervalMs(s), k = new Date();
    const I = new Date(k.getTime() - g);
    var T = await BondingErc20History.find({
      tokenAddress: m,
      timestamp: {
        $gte: I,
        $lte: k
      }
    }).sort({
      timestamp: 1,
      _id: 1
    }), h = await BondingErc20History.findOne({
      tokenAddress: m,
      timestamp: {
        $lt: I
      }
    }).sort({
      timestamp: -1,
      _id: -1
    });
    let n = "0", i = "0";
    h && (n = h.marketCapInETH || "0", i = h.totalSupply || "0");
    var w = ((e, t, a) => {
      switch (e) {
       case "5m":
       case "15m":
       case "1h":
        return 60;

       case "1d":
        return 72;

       case "7d":
        return 84;

       default:
        return Math.ceil(t / a);
      }
    })(s, g, y);
    const U = g / w, N = [];
    for (let e = 0; e < w; e++) {
      var f = new Date(I.getTime() + e * U);
      N.push({
        timestamp: f.toISOString(),
        marketCap: n,
        totalSupply: i,
        volume: "0",
        tradeCount: 0,
        lastUpdate: h ? h.timestamp : null,
        largestTx: {
          amount: "0",
          recipient: null
        }
      });
    }
    let o = new Set(), l = BigNumber.from("0"), d = 0;
    T.forEach(e => {
      var t = new Date(e.timestamp).getTime(), t = Math.floor((t - I.getTime()) / U);
      if (0 <= t && t < N.length) {
        e.marketCapInETH && (n = e.marketCapInETH), e.totalSupply && (i = e.totalSupply);
        var a, r, s = N[t];
        s.marketCap = n, s.totalSupply = i, s.lastUpdate = e.timestamp, e.amountInETH && (r = BigNumber.from(s.volume || "0"), 
        a = BigNumber.from(e.amountInETH?.replace(/^0+/, "") || "0"), s.volume = r.add(a).toString(), 
        s.tradeCount++, r = BigNumber.from(s.largestTx.amount), a.gt(r) && (s.largestTx = {
          amount: a.toString(),
          recipient: e.recipient || e.to,
          type: e.eventName
        }), l = l.add(a), d++, e.from && o.add(e.from), e.to) && o.add(e.to);
        for (let e = t + 1; e < N.length; e++) N[e].marketCap = n, N[e].totalSupply = i;
      }
    });
    var S = await Promise.all(N.map(async e => {
      var t;
      return e.largestTx.recipient ? (t = await getFarcasterUserByAnyAddress(e.largestTx.recipient.toLowerCase()), 
      {
        ...e,
        largestTx: {
          ...e.largestTx,
          user: t
        }
      }) : e;
    }));
    const B = await oneEthToUsd();
    var v, A = {
      data: S,
      stats: {
        totalVolume: l.toString(),
        totalVolumeUSD: weiToUsd(l, B),
        totalTrades: d,
        uniqueTraders: o.size
      }
    }, E = {
      ...cleanTokenData(A),
      isFartoken: !0,
      isGraduated: !1
    }, C = (E.data.forEach(e => {
      e.marketCapUsd = weiToUsd(e.marketCap, B), e.volumeUsd = weiToUsd(e.volume, B);
    }), 1 === c.marketType && (v = await getTokenPrice(NETWORK.BASE.chainId, m), 
    E.stats = {
      ...v,
      pairAddress: v.pairAddress,
      pairTotalLiquidityUsd: v.pairTotalLiquidityUsd,
      ...A.stats
    }, E.isGraduated = !0), "5m" === s ? 1 : "15m" === s ? 30 : 60);
    return await memcache.set(p, JSON.stringify(E), {
      lifetime: C
    }), t.json(E);
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/", limiter, async (a, r) => {
  try {
    var {
      cursor: s,
      sort: n = "timestamp",
      direction: i = "next",
      type: o
    } = a.query, [ l, d ] = s ? s.split("-") : [ null, null ], m = getHash(`getBondingTokens:${s || "initial"}:${n}:` + o), c = await memcache.get(m);
    if (c && "next" === i) return r.json(JSON.parse(c.value));
    var p = {
      type: {
        $in: BondingErc20.queryTokens()
      }
    };
    if (o) {
      var u = o.split(",");
      const N = BondingErc20.queryTokens();
      var g = u.filter(e => N.includes(e));
      0 < g.length && (p.type = {
        $in: g
      });
    }
    var y, k, T = "next" === i ? -1 : 1, h = (l && d && (p.$or = [ {
      [k = "lastActivity" === n ? "lastStatsUpdate" : "timestamp"]: {
        [y = "next" === i ? "$lt" : "$gt"]: new Date(Number(l))
      }
    }, {
      [k]: new Date(Number(l)),
      _id: {
        [y]: d
      }
    } ]), await BondingErc20.find(p).sort({
      ["lastActivity" === n ? "lastStatsUpdate" : "timestamp"]: T,
      _id: T
    }).limit(21)), w = 20 < h.length, f = w ? h.slice(1, 21) : h;
    const U = await oneEthToUsd();
    var S, v, A, E, C = await Promise.all(h.map(async e => {
      var t = [ getFarcasterUserByAnyAddress((e.overrideTokenCreator || e.tokenCreator).toLowerCase()), BondingErc20Transaction.findOne({
        tokenAddress: e.tokenAddress
      }).sort({
        timestamp: -1,
        _id: -1
      }).select("totalSupply") ];
      1 === e.marketType && t.push(calculateMarketCapWithUniswap(e.marketType, MAX_TOTAL_SUPPLY, e.poolAddress, e.tokenAddress));
      let a, r, s, n, i = parseInt(BASE_CHAIN_ID);
      var [ t, o, ...l ] = await Promise.all(t), d = o?.totalSupply?.replace(/^0+/, "") || "0";
      if (0 < l.length) {
        var [ l ] = l;
        try {
          a = ethers.utils.formatEther(l), r = weiToUsd(l, U);
        } catch (e) {
          console.error(e), a = "0", r = "0";
        }
      } else a = calculateMarketCap(d), r = weiToUsd(a, U);
      "FIDTOKEN" === e.type && (s = calculateAllocatedMarketCap(d, e.allocatedSupply?.replace?.(/^0+/, "") || "0"), 
      n = weiToUsd(s, U), i = 10);
      var l = getPricePerToken(d), m = e.lastStatsUpdate || e.timestamp, c = m ? new Date().getTime() + "-" + e._id : null;
      return {
        _id: e._id.toString(),
        tokenAddress: e.tokenAddress,
        pollNewTokensCursor: c,
        name: e.name,
        symbol: e.symbol,
        decimals: e.decimals,
        timestamp: e.timestamp,
        lastActivityAt: m,
        marketType: e.marketType,
        metadata: {
          ...e.metadata,
          nsfw: isTokenNSFW(e),
          image: cleanIpfsImage(e.metadata?.image)
        },
        tokenCreator: e.tokenCreator,
        actualCreator: e.actualCreator,
        tokenCreatorProfile: t,
        totalSupply: d,
        marketCapInETH: a.toString(),
        marketCapUSD: r.toString(),
        pricePerToken: l,
        pricePerTokenUSD: weiToUsd(l, U),
        bondingCurveProgress: getBondingCurveProgress(d),
        isFartoken: !0,
        latestTransaction: o,
        type: e.type,
        adjustedMarketCapInETH: s?.toString(),
        adjustedMarketCapUSD: n?.toString(),
        chainId: i
      };
    }));
    let e = null, t = (w && (S = f[f.length - 1], v = ("lastActivity" === n ? S.lastStatsUpdate : S.timestamp)?.getTime(), 
    e = v + "-" + S._id), null);
    l && 0 < f.length && (A = f[0], E = ("lastActivity" === n ? A.lastStatsUpdate : A.timestamp)?.getTime(), 
    t = E + "-" + A._id);
    var I = {
      tokens: C,
      pagination: {
        next: e,
        prev: t,
        hasMore: w
      }
    };
    return s ? "prev" === i ? await memcache.set(m + ":prev", JSON.stringify(I), {
      lifetime: 3
    }) : await memcache.set(m, JSON.stringify(I)) : await memcache.set(m, JSON.stringify(I), {
      lifetime: 60
    }), r.json(I);
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), module.exports = {
  router: app
};
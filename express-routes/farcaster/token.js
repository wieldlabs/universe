const app = require("express").Router(), Sentry = require("@sentry/node"), BondingErc20 = require("../../models/token/BondingErc20")["BondingErc20"], BondingErc20History = require("../../models/token/BondingErc20History")["BondingErc20History"], BondingErc20Transaction = require("../../models/token/BondingErc20Transaction")["BondingErc20Transaction"], {
  memcache,
  getHash
} = require("../../connectmemcache"), getLimit = require("../apikey")["getLimit"], rateLimit = require("express-rate-limit"), BigNumber = require("ethers")["BigNumber"], {
  oneEthToUsd,
  weiToUsd
} = require("../../helpers/wallet"), {
  calculateMarketCap,
  calculateMarketCapWithUniswap,
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
} = require("../../helpers/moralis"), Filter = require("bad-words"), filter = new Filter(), isTokenNSFW = e => e.metadata?.nsfw || filter.isProfane(e.metadata?.name || "") || filter.isProfane(e.metadata?.description || "") || !1, limiter = rateLimit({
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
          $in: BondingErc20.availableTokens()
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
}), app.get("/:tokenAddress", limiter, async (a, r) => {
  try {
    var s = a.params["tokenAddress"], n = s.toLowerCase(), i = "BASE", o = getHash("getBondingToken:" + n), l = await memcache.get(o);
    if (l) return r.json(cleanTokenData(JSON.parse(l.value)));
    var m, d, c, p, u, g, y, T, [ k ] = await Promise.all([ BondingErc20.findOne({
      tokenAddress: n
    }) ]);
    if (k?.type && !BondingErc20.availableTokens().includes(k.type)) return r.status(403).json({
      error: "Token not available"
    });
    if (!k) return [ m, d, c ] = await Promise.all([ getTokenMetadata(NETWORK[i].chainId, [ n ]), getTokenPrice(NETWORK[i].chainId, n), getTokenOwners(NETWORK[i].chainId, n, {
      limit: 10
    }) ]), p = m[0], u = d || {}, g = c?.result || [], y = await Promise.all(g.map(async e => ({
      user: await getFarcasterUserByAnyAddress(e.owner_address.toLowerCase()),
      address: e.owner_address,
      balance: e.balance,
      balanceFormatted: e.balance_formatted,
      percentage: e.percentage_relative_to_total_supply,
      isContract: e.is_contract,
      usdValue: e.usd_value
    }))), T = {
      isFartoken: !1,
      tokenAddress: n,
      name: p.name,
      symbol: p.symbol,
      decimals: p.decimals,
      totalSupply: p.total_supply,
      marketCapInETH: u.nativePrice?.value || "0",
      marketCapUSD: p.fully_diluted_valuation?.toString() || "0",
      pricePerToken: u.nativePrice?.value || "0",
      pricePerTokenUSD: u.usdPrice?.toString() || "0",
      timestamp: p.created_at,
      marketType: "uniswap",
      metadata: {
        name: p.name || k?.metadata?.name,
        symbol: p.symbol || k?.metadata?.symbol,
        image: p.logo || cleanIpfsImage(k?.metadata?.image),
        description: p.description || k?.metadata?.description,
        links: {
          website: p.website || k?.metadata?.websiteLink,
          twitter: p.twitter || k?.metadata?.twitter,
          discord: p.discord || k?.metadata?.discord,
          telegram: p.telegram || k?.metadata?.telegram
        }
      },
      exchangeInfo: {
        name: u.exchangeName,
        address: u.exchangeAddress,
        pairAddress: u.pairAddress,
        liquidityUSD: u.pairTotalLiquidityUsd
      },
      securityInfo: {
        score: p.security_score,
        verified: p.verified_contract,
        possibleSpam: p.possible_spam
      },
      priceChange24h: u["24hrPercentChange"],
      topHolders: y,
      pairAddress: u.pairAddress,
      pairTotalLiquidityUsd: u.pairTotalLiquidityUsd
    }, await memcache.set(o, JSON.stringify(T), {
      lifetime: 30
    }), r.json(cleanTokenData(T));
    var h = [ getTokenHolders(n, {
      limit: 10
    }), BondingErc20Transaction.findOne({
      tokenAddress: n
    }).sort({
      timestamp: -1,
      _id: -1
    }).select("totalSupply"), getFarcasterUserByAnyAddress(k.tokenCreator.toLowerCase()), oneEthToUsd() ], [ w, f, v, S, ...A ] = (1 === k.marketType && h.push(calculateMarketCapWithUniswap(k.marketType, MAX_TOTAL_SUPPLY, k.poolAddress, k.tokenAddress)), 
    await Promise.all(h));
    let e, t;
    var E, C = f?.totalSupply?.replace(/^0+/, "") || "0", b = (t = 0 < A.length ? ([ E ] = A, 
    e = ethers.utils.formatEther(E), weiToUsd(E, S)) : (e = calculateMarketCap(C), 
    weiToUsd(e, S)), getPricePerToken(C)), U = {
      tokenAddress: k.tokenAddress,
      name: k.name,
      symbol: k.symbol,
      decimals: k.decimals,
      totalSupply: C,
      marketCapInETH: e.toString(),
      marketCapUSD: t.toString(),
      pricePerToken: b,
      pricePerTokenUSD: weiToUsd(b, S),
      timestamp: k.timestamp,
      marketType: k.marketType,
      metadata: {
        ...k.metadata,
        nsfw: isTokenNSFW(k),
        image: cleanIpfsImage(k.metadata?.image)
      },
      bondingCurveProgress: getBondingCurveProgress(C?.replace(/^0+/, "") || "0"),
      tokenCreator: k.tokenCreator,
      actualCreator: k.actualCreator,
      tokenCreatorProfile: v,
      topHolders: w.holders,
      holdersCount: w.stats.holdersCount,
      isFartoken: !0,
      type: k.type
    };
    return await memcache.set(o, JSON.stringify(U), {
      lifetime: 30
    }), r.json(cleanTokenData(U));
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
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
    var i, o, l, [ m, d ] = n ? n.split("-") : [ null, null ], c = getHash(`getBondingTokenTransactions:${h}:${s}:` + (n || "initial")), p = await memcache.get(c);
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
    }, g = (m && d && (u.$or = [ {
      timestamp: {
        $lt: new Date(parseInt(m))
      }
    }, {
      timestamp: new Date(parseInt(m)),
      _id: {
        $lt: d
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
    var y, T = await Promise.all(g.map(async e => ({
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
    var k = {
      transactions: T,
      isFartoken: !0,
      pagination: {
        limit: Number(s),
        cursor: e
      }
    };
    return n ? await memcache.set(c, JSON.stringify(k), {
      lifetime: 30
    }) : await memcache.set(c, JSON.stringify(k)), a.json(k);
  } catch (e) {
    return Sentry.captureException(e), console.error(e), a.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/:tokenAddress/history", limiter, async (e, t) => {
  try {
    var a, r = e.params["tokenAddress"], {
      timerange: s = "1h"
    } = e.query, d = r.toLowerCase(), [ c ] = await Promise.all([ BondingErc20.findOne({
      tokenAddress: d
    }) ]);
    if (c?.type && !BondingErc20.availableTokens().includes(c.type)) return t.status(403).json({
      error: "Token not available"
    });
    if (!c || 1 === c.marketType) return (a = await getTokenPrice(NETWORK.BASE.chainId, d)) ? t.json({
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
    var p = getHash(`getBondingTokenHistory:${d}:` + s), u = await memcache.get(p);
    if (u) return t.json(JSON.parse(u.value));
    var g = getTimeRangeMs(s), y = getIntervalMs(s), T = new Date();
    const b = new Date(T.getTime() - g);
    var k = await BondingErc20History.find({
      tokenAddress: d,
      timestamp: {
        $gte: b,
        $lte: T
      }
    }).sort({
      timestamp: 1,
      _id: 1
    }), h = await BondingErc20History.findOne({
      tokenAddress: d,
      timestamp: {
        $lt: b
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
    const U = g / w, I = [];
    for (let e = 0; e < w; e++) {
      var f = new Date(b.getTime() + e * U);
      I.push({
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
    let o = new Set(), l = BigNumber.from("0"), m = 0;
    k.forEach(e => {
      var t = new Date(e.timestamp).getTime(), t = Math.floor((t - b.getTime()) / U);
      if (0 <= t && t < I.length) {
        e.marketCapInETH && (n = e.marketCapInETH), e.totalSupply && (i = e.totalSupply);
        var a, r, s = I[t];
        s.marketCap = n, s.totalSupply = i, s.lastUpdate = e.timestamp, e.amountInETH && (r = BigNumber.from(s.volume || "0"), 
        a = BigNumber.from(e.amountInETH?.replace(/^0+/, "") || "0"), s.volume = r.add(a).toString(), 
        s.tradeCount++, r = BigNumber.from(s.largestTx.amount), a.gt(r) && (s.largestTx = {
          amount: a.toString(),
          recipient: e.recipient || e.to,
          type: e.eventName
        }), l = l.add(a), m++, e.from && o.add(e.from), e.to) && o.add(e.to);
        for (let e = t + 1; e < I.length; e++) I[e].marketCap = n, I[e].totalSupply = i;
      }
    });
    var v = await Promise.all(I.map(async e => {
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
    var S, A = {
      data: v,
      stats: {
        totalVolume: l.toString(),
        totalVolumeUSD: weiToUsd(l, B),
        totalTrades: m,
        uniqueTraders: o.size
      }
    }, E = {
      ...cleanTokenData(A),
      isFartoken: !0,
      isGraduated: !1
    }, C = (E.data.forEach(e => {
      e.marketCapUsd = weiToUsd(e.marketCap, B), e.volumeUsd = weiToUsd(e.volume, B);
    }), 1 === c.marketType && (S = await getTokenPrice(NETWORK.BASE.chainId, d), 
    E.stats = {
      ...S,
      pairAddress: S.pairAddress,
      pairTotalLiquidityUsd: S.pairTotalLiquidityUsd,
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
      direction: i = "next"
    } = a.query, [ o, l ] = s ? s.split("-") : [ null, null ], m = getHash(`getBondingTokens:${s || "initial"}:` + n), d = await memcache.get(m);
    if (d && "next" === i) return r.json(JSON.parse(d.value));
    var c, p, u = {
      type: {
        $in: BondingErc20.queryTokens()
      }
    }, g = "next" === i ? -1 : 1, y = (o && l && (u.$or = [ {
      [p = "lastActivity" === n ? "lastStatsUpdate" : "timestamp"]: {
        [c = "next" === i ? "$lt" : "$gt"]: new Date(Number(o))
      }
    }, {
      [p]: new Date(Number(o)),
      _id: {
        [c]: l
      }
    } ]), await BondingErc20.find(u).sort({
      ["lastActivity" === n ? "lastStatsUpdate" : "timestamp"]: g,
      _id: g
    }).limit(21)), T = 20 < y.length, k = T ? y.slice(1, 21) : y;
    const E = await oneEthToUsd();
    var h, w, f, v, S = await Promise.all(y.map(async e => {
      var t = [ getFarcasterUserByAnyAddress(e.tokenCreator.toLowerCase()), BondingErc20Transaction.findOne({
        tokenAddress: e.tokenAddress
      }).sort({
        timestamp: -1,
        _id: -1
      }).select("totalSupply") ];
      1 === e.marketType && t.push(calculateMarketCapWithUniswap(e.marketType, MAX_TOTAL_SUPPLY, e.poolAddress, e.tokenAddress));
      let a, r;
      var [ t, s, ...n ] = await Promise.all(t), i = s?.totalSupply?.replace(/^0+/, "") || "0";
      if (0 < n.length) {
        var [ n ] = n;
        try {
          a = ethers.utils.formatEther(n), r = weiToUsd(n, E);
        } catch (e) {
          console.error(e), a = "0", r = "0";
        }
      } else a = calculateMarketCap(i), r = weiToUsd(a, E);
      var n = getPricePerToken(i), o = e.lastStatsUpdate || e.timestamp, l = o ? new Date().getTime() + "-" + e._id : null;
      return {
        _id: e._id.toString(),
        tokenAddress: e.tokenAddress,
        pollNewTokensCursor: l,
        name: e.name,
        symbol: e.symbol,
        decimals: e.decimals,
        timestamp: e.timestamp,
        lastActivityAt: o,
        marketType: e.marketType,
        metadata: {
          ...e.metadata,
          nsfw: isTokenNSFW(e),
          image: cleanIpfsImage(e.metadata?.image)
        },
        tokenCreator: e.tokenCreator,
        actualCreator: e.actualCreator,
        tokenCreatorProfile: t,
        totalSupply: i,
        marketCapInETH: a.toString(),
        marketCapUSD: r.toString(),
        pricePerToken: n,
        pricePerTokenUSD: weiToUsd(n, E),
        bondingCurveProgress: getBondingCurveProgress(i),
        isFartoken: !0,
        latestTransaction: s,
        type: e.type
      };
    }));
    let e = null, t = (T && (h = k[k.length - 1], w = ("lastActivity" === n ? h.lastStatsUpdate : h.timestamp)?.getTime(), 
    e = w + "-" + h._id), null);
    o && 0 < k.length && (f = k[0], v = ("lastActivity" === n ? f.lastStatsUpdate : f.timestamp)?.getTime(), 
    t = v + "-" + f._id);
    var A = {
      tokens: S,
      pagination: {
        next: e,
        prev: t,
        hasMore: T
      }
    };
    return s ? "prev" === i ? await memcache.set(m + ":prev", JSON.stringify(A), {
      lifetime: 3
    }) : await memcache.set(m, JSON.stringify(A)) : await memcache.set(m, JSON.stringify(A), {
      lifetime: 60
    }), r.json(A);
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), module.exports = {
  router: app
};
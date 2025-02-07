const app = require("express").Router(), Sentry = require("@sentry/node"), {
  Influencers,
  InfluencerTokens,
  InfluencerAddresses,
  TokenBreakdown,
  Transactions
} = require("../../models/farcaster/analytics"), {
  TIME_PERIODS,
  CHAINS,
  BASE_DEX_CONTRACTS_LOWERCASE,
  TRANSACTION_CATEGORIES
} = require("../../schemas/farcaster/analytics"), {
  memcache,
  getHash
} = require("../../connectmemcache"), getLimit = require("../apikey")["getLimit"], Moralis = require("moralis").default, rateLimit = require("express-rate-limit"), {
  getNativeBalance,
  getTokenBalances,
  getWalletTokenStats,
  getWalletNetWorth,
  getPnLHistory,
  getWalletHistory,
  decorateTransactionWithPnlHistory,
  decorateTokenWithPnlHistory,
  getTokenMetadata,
  getWalletTokenTransfers,
  decorateTransfersWithPnlHistory,
  cleanTransaction,
  decorateTransactionsPrices,
  cleanTokenToMoralis
} = require("../../helpers/moralis"), {
  getFarcasterUserByFid,
  getFarcasterUserByAnyAddress
} = require("../../helpers/farcaster"), {
  calculateMarketCap,
  calculateAllocatedMarketCap,
  getBondingCurveProgress,
  getPricePerToken,
  calculateMarketCapWithUniswap,
  MAX_TOTAL_SUPPLY
} = require("../../helpers/fartoken"), {
  oneEthToUsd,
  weiToUsd
} = require("../../helpers/wallet"), BondingErc20Transaction = require("../../models/token/BondingErc20Transaction")["BondingErc20Transaction"], lightLimiter = rateLimit({
  windowMs: 1e3,
  max: getLimit(5),
  message: "Too many requests or invalid API key! See docs.wield.xyz for more info.",
  validate: {
    limit: !1
  }
}), limiter = rateLimit({
  windowMs: 5e3,
  max: getLimit(5),
  message: "Too many requests or invalid API key! See docs.wield.xyz for more info.",
  validate: {
    limit: !1
  }
}), heavyLimiter = rateLimit({
  windowMs: 5e3,
  max: getLimit(1),
  message: "Too many requests or invalid API key! See docs.wield.xyz for more info.",
  validate: {
    limit: !1
  }
}), formatUnits = require("ethers/lib/utils")["formatUnits"], ethers = require("ethers")["ethers"], BondingErc20 = require("../../models/token/BondingErc20")["BondingErc20"], cleanIpfsImage = require("../../helpers/clean-ipfs")["cleanIpfsImage"], getAddressTokens = require("../../helpers/fartoken")["getAddressTokens"], requireAuth = require("../../helpers/auth-middleware")["requireAuth"], BASE_CHAIN_ID = "0x2105", REAL_TIME_DELAY = 3e5, initMoralis = async () => {
  Moralis.Core.isStarted || await Moralis.start({
    apiKey: process.env.MORALIS_API_KEY
  });
}, getTopBuyersForToken = (app.get("/address/:address/transactions", [ limiter ], async (e, r) => {
  try {
    if (!(await requireAuth(e.headers.authorization || "")).payload.id) throw new Error("jwt must be provided");
    await initMoralis();
    const m = e.params["address"];
    var t = e.query["categoryFilter"], a = Math.min(parseInt(e.query.limit) || 10, 100), s = e.query.cursor, i = getHash(`getTransactions:${m}:${t || "all"}:${a}:` + (s || "initial")), n = await memcache.get(i);
    if (n) return r.json(JSON.parse(n.value));
    var o, l, d, c, [ u ] = await Promise.all([ getWalletTokenTransfers(BASE_CHAIN_ID, m, {
      limit: a,
      cursor: s
    }) ]);
    if (u.result) return o = u.result, l = await decorateTransactionsPrices(o.map(e => cleanTransaction(e, m)), BASE_CHAIN_ID), 
    c = {
      result: (d = {
        ...u,
        result: l
      }).result,
      cursor: d.cursor
    }, await memcache.set(i, JSON.stringify(c), {
      lifetime: 60
    }), r.json(c);
    throw new Error("getWalletTokenTransfers is empty");
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/address/:address/holdings", [ limiter ], async (e, r) => {
  try {
    if (!(await requireAuth(e.headers.authorization || "")).payload.id) throw new Error("jwt must be provided");
    await initMoralis();
    var t = e.params["address"], a = "true" === e.query.fartokenOnly, s = "false" !== e.query.ignoreSmallValues, i = getHash(`getHoldings:${t}:${s}:` + a), n = await memcache.get(i);
    if (n) return r.json(JSON.parse(n.value));
    if (a) {
      var o = await getAddressTokens(t, {
        ignoreSmallValues: s
      });
      const p = await oneEthToUsd();
      var l = {
        address: t,
        token_holdings: (await Promise.all(o.tokens.map(async e => {
          if (!e) return null;
          var r = e.totalSupply?.replace(/^0+/, "") || "0";
          let t, a, s, i, n = parseInt(BASE_CHAIN_ID);
          a = 1 === e.marketType ? (o = await calculateMarketCapWithUniswap(e.marketType, MAX_TOTAL_SUPPLY, e.poolAddress, e.tokenAddress), 
          t = ethers.utils.formatEther(o), weiToUsd(o, p)) : (t = calculateMarketCap(r), 
          weiToUsd(t, p)), "FIDTOKEN" === e.type && (s = calculateAllocatedMarketCap(r, e.allocatedSupply?.replace?.(/^0+/, "") || "0"), 
          i = weiToUsd(s, p), n = 10);
          var o = getPricePerToken(r), e = {
            ...e,
            isFartoken: !0,
            marketCapInETH: t,
            marketCapUSD: a,
            pricePerToken: o,
            pricePerTokenUSD: weiToUsd(o, p),
            bondingCurveProgress: getBondingCurveProgress(r),
            adjustedMarketCapInETH: s?.toString(),
            adjustedMarketCapUSD: i?.toString(),
            chainId: n,
            metadata: {
              ...e.metadata,
              image: cleanIpfsImage(e.metadata?.image)
            }
          };
          return {
            ...cleanTokenToMoralis(e),
            price_per_token: o,
            price_per_token_usd: weiToUsd(o, p),
            market_cap_in_eth: t,
            market_cap_usd: a,
            bonding_curve_progress: getBondingCurveProgress(r),
            adjusted_market_cap_in_eth: s?.toString(),
            adjusted_market_cap_usd: i?.toString(),
            chain_id: n
          };
        }))).filter(Boolean),
        pagination: o.pagination
      };
      return await memcache.set(i, JSON.stringify(l), {
        lifetime: 30
      }), r.json(l);
    }
    var [ d, c ] = await Promise.all([ getTokenBalances(t, BASE_CHAIN_ID, s), getPnLHistory(t, BASE_CHAIN_ID) ]), u = decorateTokenWithPnlHistory(d, c), m = u.reduce((e, r) => e + (parseFloat(r.usdValue || r.usd_value) || 0), 0), f = {
      address: t,
      token_holdings: u,
      total_portfolio_value: m
    };
    return await memcache.set(i, JSON.stringify(f), {
      lifetime: 30
    }), r.json(f);
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/address/:address/overview", [ limiter ], async (e, r) => {
  try {
    var t, a, s, i, n, o, l, d, c, u;
    if ((await requireAuth(e.headers.authorization || "")).payload.id) return t = e.params["address"], 
    a = "false" !== e.query.ignoreSmallValues, s = getHash(`getAddressOverview:${t}:` + a), 
    (i = await memcache.get(s)) ? r.json(JSON.parse(i.value)) : ([ n, o, l ] = await Promise.all([ getTokenBalances(t, BASE_CHAIN_ID, a), getPnLHistory(t, BASE_CHAIN_ID), getWalletTokenStats(t, BASE_CHAIN_ID, "all") ]), 
    console.log({
      tokenStats: l
    }), d = n.reduce((e, r) => e + (parseFloat(r.usd_value) || 0), 0), c = o.sort((e, r) => Math.abs(r.realized_profit_usd) - Math.abs(e.realized_profit_usd)), 
    u = {
      address: t,
      token_holdings: n,
      profit_summary: {
        total_realized_profit_usd: parseFloat(l.summary?.total_realized_profit_usd || "0"),
        total_realized_profit_percentage: parseFloat(l.summary?.total_realized_profit_percentage || "0"),
        total_trade_volume: parseFloat(l.summary?.total_trade_volume || "0"),
        total_trades: parseInt(l.summary?.total_count_of_trades || "0"),
        total_portfolio_value: d
      },
      pnl_history: c
    }, await memcache.set(s, JSON.stringify(u), {
      lifetime: 300
    }), r.json(u));
    throw new Error("jwt must be provided");
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/influencers/all", lightLimiter, async (t, a) => {
  try {
    var [ s, i ] = t.query.cursor ? t.query.cursor.split("-") : [ null, null ], n = Math.min(parseInt(t.query.limit) || 10, 25), o = t.query.sortBy || "followerCount", l = [ "followerCount", "totalRealizedProfitUsd.7d", "totalRealizedProfitUsd.30d", "totalRealizedProfitUsd.all", "totalBoughtVolumeUsd.all" ];
    if (!l.includes(o)) return a.status(400).json({
      error: "Invalid sort parameter. Must be one of: " + l.join(", ")
    });
    let e;
    var d, c, u, m, f, p, g, y = getHash(`getInfluencers:${n}:${o}:` + (t.query.cursor || "initial"));
    (e = t.query.cursor && (d = await memcache.get(y)) ? JSON.parse(d.value) : e) || (c = {}, 
    s && !isNaN(parseFloat(s)) && (c[o] = {
      $lt: parseFloat(s)
    }), i && (c._id = {
      $lt: i
    }), u = {
      [o]: -1,
      _id: -1
    }, m = await Influencers.find(c).sort(u).limit(n), f = await Promise.all(m.map(async e => {
      var r = await getFarcasterUserByFid(e.fid);
      return {
        ...e.toObject(),
        profile: r
      };
    })), e = f, t.query.cursor ? await memcache.set(y, JSON.stringify(e)) : await memcache.set(y, JSON.stringify(e), {
      lifetime: 60
    }));
    let r = null;
    return e.length === n && (p = e[e.length - 1], null == (g = o.split(".").reduce((e, r) => e?.[r], p)) || isNaN(g) || (r = g + "-" + p._id)), 
    a.json({
      result: {
        influencers: e
      },
      next: r,
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), a.status(500).json({
      error: "Internal Server Error"
    });
  }
}), async (e, r, t) => {
  var a = getHash(`getTopBuyersForToken:${e}:${r}:` + t), s = await memcache.get(a);
  return s ? JSON.parse(s.value) : (s = await TokenBreakdown.aggregate([ {
    $match: {
      tokenAddress: e.toLowerCase(),
      chain: r,
      timePeriod: t,
      totalTokensBought: {
        $gt: 0
      }
    }
  }, {
    $lookup: {
      from: "farcaster.analytics.influenceraddresses",
      localField: "influencerAddress",
      foreignField: "address",
      pipeline: [ {
        $match: {
          chain: r,
          timePeriod: t
        }
      } ],
      as: "addressInfo"
    }
  }, {
    $match: {
      addressInfo: {
        $ne: []
      }
    }
  }, {
    $unwind: "$addressInfo"
  }, {
    $lookup: {
      from: "farcaster.analytics.influencers",
      localField: "addressInfo.fid",
      foreignField: "fid",
      as: "influencer"
    }
  }, {
    $match: {
      influencer: {
        $ne: []
      }
    }
  }, {
    $unwind: "$influencer"
  }, {
    $group: {
      _id: "$addressInfo.fid",
      fid: {
        $first: "$addressInfo.fid"
      },
      followerCount: {
        $first: "$influencer.followerCount"
      },
      totalTokensBought: {
        $sum: "$totalTokensBought"
      },
      totalUsdInvested: {
        $sum: "$totalUsdInvested"
      },
      address: {
        $first: "$influencerAddress"
      }
    }
  }, {
    $sort: {
      followerCount: -1
    }
  }, {
    $limit: 3
  }, {
    $project: {
      _id: 0,
      fid: 1,
      address: 1,
      followerCount: 1,
      totalTokensBought: 1,
      totalUsdInvested: 1
    }
  } ]).hint({
    tokenAddress: 1,
    chain: 1,
    timePeriod: 1,
    totalTokensBought: -1
  }), e = await Promise.all(s.map(async e => ({
    ...e,
    profile: await getFarcasterUserByFid(e.fid)
  }))), await memcache.set(a, JSON.stringify(e), {
    lifetime: 900
  }), e);
}), enhanceTransaction = (app.get("/influencers/trending-tokens", lightLimiter, async (r, t) => {
  try {
    var a = Math.min(parseInt(r.query.limit) || 10, 100), s = r.query.sortBy || "totalRealizedProfitUsd";
    const g = r.query.chain || "BASE", y = r.query.timePeriod || "all";
    var [ i, n ] = r.query.cursor ? r.query.cursor.split("-") : [ null, null ];
    if (!Object.keys(TIME_PERIODS).includes(y)) return t.status(400).json({
      error: "Invalid timePeriod parameter. Must be one of: " + Object.keys(TIME_PERIODS).join(", ")
    });
    if (!CHAINS.includes(g)) return t.status(400).json({
      error: "Invalid chain parameter. Must be one of: " + CHAINS.join(", ")
    });
    var o = [ "totalRealizedProfitUsd", "totalUsdInvested", "uniqueTraders", "countOfTrades" ];
    if (!o.includes(s)) return t.status(400).json({
      error: "Invalid sortBy parameter. Must be one of: " + o.join(", ")
    });
    var l = getHash(`getTopTokens:${a}:${s}:${g}:${y}:` + (r.query.cursor || "initial")), d = await memcache.get(l);
    if (d) return t.json(JSON.parse(d.value));
    var c = {
      chain: g,
      timePeriod: y,
      [s]: {
        $exists: !0,
        $ne: null
      }
    }, u = (i && !isNaN(parseFloat(i)) && (c[s] = {
      $lt: parseFloat(i)
    }), n && (c._id = {
      $lt: n
    }), await InfluencerTokens.find(c).sort({
      [s]: -1,
      _id: -1
    }).limit(a));
    const [ h, S ] = await Promise.all([ getTokenMetadata(BASE_CHAIN_ID, u.map(e => e.tokenAddress)), Promise.all(u.map(e => getTopBuyersForToken(e.tokenAddress, g, y))) ]), _ = h.reduce((e, r) => (e[r.address.toLowerCase()] = r, 
    e), {});
    var m, f = u.map((e, r) => {
      var t = e.tokenAddress.toLowerCase(), t = _[t] || {}, r = S[r] || [];
      return {
        ...e.toObject(),
        metadata: t,
        topBuyers: r
      };
    });
    let e = null;
    f.length === a && (m = f[f.length - 1], e = m[s] + "-" + m._id);
    var p = {
      tokens: f,
      next: e,
      sortBy: s,
      chain: g,
      timePeriod: y
    };
    return await memcache.set(l, JSON.stringify(p), {
      lifetime: 300
    }), t.json(p);
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/influencers/:fid", lightLimiter, async (e, r) => {
  try {
    var t, a, s, i, n = e.params["fid"], o = e.query.chain || "BASE", l = e.query.timePeriod || "all";
    return Object.keys(TIME_PERIODS).includes(l) ? CHAINS.includes(o) ? (t = getHash(`getInfluencerAddresses:${n}:${o}:` + l), 
    (a = await memcache.get(t)) ? r.json(JSON.parse(a.value)) : (s = await InfluencerAddresses.find({
      fid: n,
      chain: o,
      timePeriod: l
    }).sort({
      totalRealizedProfitUsd: -1,
      _id: -1
    }), i = {
      fid: n,
      profile: await getFarcasterUserByFid(n),
      addresses: s,
      chain: o,
      timePeriod: l
    }, await memcache.set(t, JSON.stringify(i), {
      lifetime: 300
    }), r.json(i))) : r.status(400).json({
      error: "Invalid chain parameter. Must be one of: " + CHAINS.join(", ")
    }) : r.status(400).json({
      error: "Invalid timePeriod parameter. Must be one of: " + Object.keys(TIME_PERIODS).join(", ")
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/influencers/transactions/all", limiter, async (a, s) => {
  try {
    var i, n = Math.min(parseInt(a.query.limit) || 20, 100), o = (a.query.chain || "BASE").toUpperCase(), l = a.query.category?.toLowerCase();
    let [ e, r ] = a.query.cursor ? a.query.cursor.split("-") : [ null, null ];
    if (!(e = e ? (i = Date.now() - REAL_TIME_DELAY, Math.min(parseInt(e), i)) : "production" === process.env.NODE_ENV ? Date.now() - (REAL_TIME_DELAY + 3e5) : Date.now() - 864e5)) return s.status(400).json({
      error: "Timestamp is required"
    });
    if (!CHAINS.includes(o)) return s.status(400).json({
      error: "Invalid chain parameter. Must be one of: " + CHAINS.join(", ")
    });
    if (l && ![ "swap", "buy", "sell", "created" ].includes(l)) return s.status(400).json({
      error: "Invalid category. Must be one of: swap, buy, sell, created"
    });
    var d = getHash(`getGlobalTransactions:${o}:${l || "all"}:${n}:` + (a.query.cursor || "initial")), c = await memcache.get(d);
    if (c) return s.json(JSON.parse(c.value));
    var u = {
      chain: o,
      isSwap: !0,
      category: {
        $in: TRANSACTION_CATEGORIES.filter(e => "airdrop" !== e)
      }
    }, m = new Date(e), f = new Date(Date.now() - REAL_TIME_DELAY);
    if (u.timestamp = {
      $lt: f
    }, r ? u.$or = [ {
      timestamp: {
        $gt: m
      }
    }, {
      timestamp: m,
      _id: {
        $gt: r
      }
    } ] : u.timestamp.$gt = m, l) {
      var p = {
        from: {
          $in: Object.keys(BASE_DEX_CONTRACTS_LOWERCASE)
        }
      }, g = {
        to: {
          $in: Object.keys(BASE_DEX_CONTRACTS_LOWERCASE)
        }
      };
      switch (l) {
       case "swap":
        u.$or = [ p, g ];
        break;

       case "buy":
        u.from = {
          $in: Object.keys(BASE_DEX_CONTRACTS_LOWERCASE)
        }, u.to = {
          $nin: Object.keys(BASE_DEX_CONTRACTS_LOWERCASE)
        };
        break;

       case "sell":
        u.from = {
          $nin: Object.keys(BASE_DEX_CONTRACTS_LOWERCASE)
        }, u.to = {
          $in: Object.keys(BASE_DEX_CONTRACTS_LOWERCASE)
        };
        break;

       case "created":
        u.from = ethers.constants.AddressZero;
      }
    }
    var y = await Transactions.find(u).sort({
      timestamp: 1,
      _id: 1
    }).limit(n + 1).lean(), h = y.length > n, S = y.slice(0, n), _ = new Set(S.map(e => e.fid)), A = new Set(S.filter(e => !e.isFartoken).map(e => e.rawContract?.address).filter(Boolean)), I = new Set(S.filter(e => e.isFartoken).map(e => e.rawContract?.address?.toLowerCase()).filter(Boolean));
    const $ = new Map();
    var w = Array.from(_).map(async e => {
      let r = null;
      (r = "0x" === e.slice(0, 2) ? await getFarcasterUserByAnyAddress(e) : await getFarcasterUserByFid(e)) && $.set(e, r);
    }), T = Array.from(I), E = T.length ? BondingErc20.find({
      tokenAddress: {
        $in: T
      },
      type: {
        $in: BondingErc20.queryTokens()
      }
    }) : [], k = getTokenMetadata(BASE_CHAIN_ID, [ ...A ]), [ v, C ] = await Promise.all([ k, E, ...w ]);
    const j = v.reduce((e, r) => (e[r.address.toLowerCase()] = r, e), {}), N = C.reduce((e, r) => (e[r.tokenAddress.toLowerCase()] = {
      ...r.metadata,
      address: r.tokenAddress,
      logo: cleanIpfsImage(r.metadata?.image)
    }, e), {});
    var O, P = S.map(e => {
      var r = e.from.toLowerCase(), t = e.to.toLowerCase(), a = BASE_DEX_CONTRACTS_LOWERCASE[r] || e.isFartoken && r === ethers.constants.AddressZero, s = BASE_DEX_CONTRACTS_LOWERCASE[t] || e.isFartoken && t === ethers.constants.AddressZero, i = e.from === ethers.constants.AddressZero && "erc20created" === e.category, n = j[e.rawContract?.address?.toLowerCase()] || N[e.rawContract?.address?.toLowerCase()];
      return e.isFartoken && !n ? null : {
        ...e,
        isSwap: !(!a && !s),
        dexInfo: a || s || null,
        tokenMetadata: n,
        fromProfile: e.fid && r === e.from.toLowerCase() ? $.get(e.fid) : null,
        toProfile: e.fid && t === e.to.toLowerCase() ? $.get(e.fid) : null,
        isBuy: !(!a || !e.fid),
        isSell: !(!s || !e.fid),
        isTokenCreated: i,
        isFartoken: e.isFartoken
      };
    }).filter(Boolean);
    let t = null;
    h && 0 < S.length && (O = S[S.length - 1], t = new Date(O.timestamp).getTime() + "-" + O._id);
    var B = {
      result: {
        transactions: P
      },
      next: t,
      chain: o,
      category: l
    };
    return await memcache.set(d, JSON.stringify(B), {
      lifetime: 10
    }), s.json(B);
  } catch (e) {
    return Sentry.captureException(e), console.error("Error fetching global transactions:", e), 
    s.status(500).json({
      error: "Internal server error"
    });
  }
}), app.get("/influencers/:fid/transactions", limiter, async (r, t) => {
  try {
    var a = r.params["fid"], s = Math.min(parseInt(r.query.limit) || 20, 100), i = (r.query.chain || "BASE").toUpperCase(), n = "all", [ o, l ] = r.query.cursor ? r.query.cursor.split("-") : [ null, null ];
    if (!a) return t.status(400).json({
      error: "FID is required"
    });
    if (!CHAINS.includes(i)) return t.status(400).json({
      error: "Invalid chain parameter. Must be one of: " + CHAINS.join(", ")
    });
    if (!Object.keys(TIME_PERIODS).includes(n)) return t.status(400).json({
      error: "Invalid timePeriod parameter. Must be one of: " + Object.keys(TIME_PERIODS).join(", ")
    });
    var d = getHash(`getInfluencerFidTransactions:${a}:${i}:all:${s}:` + (r.query.cursor || "initial")), c = await memcache.get(d);
    if (c) return t.json(JSON.parse(c.value));
    var u = await InfluencerAddresses.find({
      fid: a,
      chain: i,
      timePeriod: n
    }).select("address");
    if (!u.length) return t.json({
      transactions: [],
      next: null,
      chain: i,
      timePeriod: n
    });
    const A = u.map(e => e.address.toLowerCase());
    var m, f = {
      chain: i,
      isSwap: !0,
      $or: [ {
        from: {
          $in: A
        }
      }, {
        to: {
          $in: A
        }
      } ]
    }, p = (o && (f.timestamp = {
      $lt: new Date(parseInt(o))
    }, l) && (f.$or = [ {
      timestamp: {
        $lt: new Date(parseInt(o))
      }
    }, {
      timestamp: new Date(parseInt(o)),
      _id: {
        $lt: l
      }
    } ]), await getFarcasterUserByFid(a)), g = await Transactions.find(f).sort({
      timestamp: -1,
      _id: -1
    }).limit(s + 1).lean(), y = g.length > s, h = g.slice(0, s), S = h.map(e => enhanceTransaction(e, {
      influencerAddresses: A
    }));
    let e = null;
    y && 0 < h.length && (m = h[h.length - 1], e = new Date(m.timestamp).getTime() + "-" + m._id);
    var _ = {
      fid: a,
      profile: p,
      transactions: S,
      next: e,
      chain: i,
      timePeriod: n,
      addresses: u.map(e => e.address)
    };
    return await memcache.set(d, JSON.stringify(_), {
      lifetime: 30
    }), t.json(_);
  } catch (e) {
    return Sentry.captureException(e), console.error("Error fetching influencer transactions:", e), 
    t.status(500).json({
      error: "Internal server error"
    });
  }
}), app.get("/influencers/token/:tokenAddress", lightLimiter, async (r, t) => {
  try {
    var a = r.params["tokenAddress"];
    const h = r.query.chain || "BASE", S = r.query.timePeriod || "all";
    var s = Math.min(parseInt(r.query.limit) || 10, 100), i = r.query.sortBy || "realizedProfitUsd", [ n, o ] = r.query.cursor ? r.query.cursor.split("-") : [ null, null ];
    if (!Object.keys(TIME_PERIODS).includes(S)) return t.status(400).json({
      error: "Invalid timePeriod parameter. Must be one of: " + Object.keys(TIME_PERIODS).join(", ")
    });
    if (!CHAINS.includes(h)) return t.status(400).json({
      error: "Invalid chain parameter. Must be one of: " + CHAINS.join(", ")
    });
    var l = [ "realizedProfitUsd", "totalUsdInvested", "totalTokensBought", "totalTokensSold", "countOfTrades" ];
    if (!l.includes(i)) return t.status(400).json({
      error: "Invalid sortBy parameter. Must be one of: " + l.join(", ")
    });
    var d = getHash(`getTokenInfluencers:${a}:${h}:${S}:${s}:${i}:` + (r.query.cursor || "initial")), c = await memcache.get(d);
    if (c) return t.json(JSON.parse(c.value));
    var u = {
      tokenAddress: a,
      chain: h,
      timePeriod: S
    }, m = (n && !isNaN(parseFloat(n)) && (u[i] = {
      $lt: parseFloat(n)
    }), o && (u._id = {
      $lt: o
    }), await TokenBreakdown.find(u).sort({
      [i]: -1,
      _id: -1
    }).limit(s)), f = await InfluencerAddresses.find({
      address: {
        $in: m.map(e => e.influencerAddress)
      },
      chain: h,
      timePeriod: S
    }).distinct("fid");
    const _ = await Promise.all(f.map(async e => {
      return {
        fid: e,
        profile: await getFarcasterUserByFid(e)
      };
    }));
    var p, g = await Promise.all(m.map(async e => {
      var r = e.influencerAddress;
      const t = await InfluencerAddresses.findOne({
        address: r,
        chain: h,
        timePeriod: S
      });
      r = _.find(e => e.fid === t?.fid)?.profile;
      return {
        ...e.toObject(),
        fid: t?.fid,
        profile: r
      };
    }));
    let e = null;
    g.length === s && (p = g[g.length - 1], e = p[i] + "-" + p._id);
    var y = {
      token: {
        address: a,
        name: m[0]?.name,
        symbol: m[0]?.symbol,
        decimals: m[0]?.decimals,
        logo: m[0]?.logo,
        possibleSpam: m[0]?.possibleSpam
      },
      influencers: g,
      next: e,
      chain: h,
      timePeriod: S
    };
    return await memcache.set(d, JSON.stringify(y), {
      lifetime: 300
    }), t.json(y);
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/influencers/:fid/:tokenAddress", lightLimiter, async (e, r) => {
  try {
    var t, a, s, i, n, o, l, {
      fid: d,
      tokenAddress: c
    } = e.params, u = e.query.chain || "BASE", m = e.query.timePeriod || "all";
    return Object.keys(TIME_PERIODS).includes(m) ? CHAINS.includes(u) ? (t = getHash(`getTokenBreakdown:${d}:${c}:${u}:` + m), 
    (a = await memcache.get(t)) ? r.json(JSON.parse(a.value)) : (s = await InfluencerAddresses.find({
      fid: d,
      chain: u,
      timePeriod: m
    }).select("address"), i = await TokenBreakdown.find({
      influencerAddress: {
        $in: s.map(e => e.address)
      },
      tokenAddress: c,
      chain: u,
      timePeriod: m
    }), n = await getFarcasterUserByFid(d), 0 < (o = i.reduce((e, r) => ({
      totalUsdInvested: (e.totalUsdInvested || 0) + r.totalUsdInvested,
      totalTokensBought: (e.totalTokensBought || 0) + r.totalTokensBought,
      totalTokensSold: (e.totalTokensSold || 0) + r.totalTokensSold,
      totalSoldUsd: (e.totalSoldUsd || 0) + r.totalSoldUsd,
      countOfTrades: (e.countOfTrades || 0) + r.countOfTrades,
      realizedProfitUsd: (e.realizedProfitUsd || 0) + r.realizedProfitUsd,
      totalBuys: (e.totalBuys || 0) + r.totalBuys,
      totalSells: (e.totalSells || 0) + r.totalSells
    }), {})).totalSoldUsd && (o.realizedProfitPercentage = o.realizedProfitUsd / o.totalUsdInvested * 100), 
    l = {
      fid: d,
      profile: n,
      tokenAddress: c,
      chain: u,
      timePeriod: m,
      tokenMetadata: i[0] ? {
        name: i[0].name,
        symbol: i[0].symbol,
        decimals: i[0].decimals,
        logo: i[0].logo,
        possibleSpam: i[0].possibleSpam
      } : null,
      aggregatedStats: o,
      addressBreakdowns: i
    }, await memcache.set(t, JSON.stringify(l), {
      lifetime: 300
    }), r.json(l))) : r.status(400).json({
      error: "Invalid chain parameter. Must be one of: " + CHAINS.join(", ")
    }) : r.status(400).json({
      error: "Invalid timePeriod parameter. Must be one of: " + Object.keys(TIME_PERIODS).join(", ")
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), (e, r) => {
  var {
    influencerAddresses: r,
    addressToFidMap: t,
    profiles: a
  } = r, s = e.from.toLowerCase(), i = e.to.toLowerCase(), n = BASE_DEX_CONTRACTS_LOWERCASE[i] || BASE_DEX_CONTRACTS_LOWERCASE[s], o = BASE_DEX_CONTRACTS_LOWERCASE[s], l = BASE_DEX_CONTRACTS_LOWERCASE[i], e = {
    ...e,
    isSwap: !!n,
    dexInfo: n || null
  };
  return r && (n = r.includes(s) || r.includes(i), e.fromIsInfluencer = r.includes(s), 
  e.toIsInfluencer = r.includes(i), e.isBuy = !(!n || !o), e.isSell = !(!n || !l)), 
  t && (r = t.get(s), n = t.get(i), e.fromFid = r, e.toFid = n, a) && (e.fromProfile = r ? a.get(r) : null, 
  e.toProfile = n ? a.get(n) : null, e.isBuy = o && n, e.isSell = l && r), e;
});

module.exports = {
  router: app
};
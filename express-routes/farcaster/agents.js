const app = require("express").Router(), Sentry = require("@sentry/node"), rateLimit = require("express-rate-limit"), _CacheService = require("../../services/cache/CacheService")["Service"], _FarcasterHubService = require("../../services/identities/FarcasterHubService")["Service"], _FarcasterV2InviteService = require("../../services/farcaster/FarcasterV2InviteService")["Service"], Account = require("../../models/Account")["Account"], {
  AgentRequest,
  AgentAuthorization,
  Agent,
  AgentTip,
  AgentInvite
} = require("../../models/farcaster/agents"), getLimit = require("../apikey")["getLimit"], BondingErc20 = require("../../models/token/BondingErc20")["BondingErc20"], {
  calculateMarketCap,
  getPricePerToken
} = require("../../helpers/fartoken"), {
  oneEthToUsd,
  weiToUsd
} = require("../../helpers/wallet"), {
  getFarcasterUserByAnyAddress,
  getFarcasterUserByFid,
  getFarcasterUserPrimaryAddress
} = require("../../helpers/farcaster"), {
  memcache,
  getHash
} = require("../../connectmemcache"), BondingErc20Transaction = require("../../models/token/BondingErc20Transaction")["BondingErc20Transaction"], cleanIpfsImage = require("../../helpers/clean-ipfs")["cleanIpfsImage"], {
  createClan,
  createClanTipWrapper
} = require("../../helpers/agents/create-clan"), farcasterAuthContext = require("../farcaster")["farcasterAuthContext"], verifyAddressAndClaimTips = require("../../helpers/agents/tips")["verifyAddressAndClaimTips"], BASE_CHAIN_ID = "0x2105", lightLimiter = rateLimit({
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
});

function escapeRegExp(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

app.post("/v2/agent-requests", [ heavyLimiter ], async (r, t) => {
  try {
    var {
      currentOwnerFid: a,
      shouldDeployTipWrapper: s
    } = r.body;
    if (!a) return t.status(400).json({
      error: "fid is required"
    });
    var n = await getFarcasterUserByFid(a);
    if (!n) return t.status(400).json({
      error: "Farcaster user not found"
    });
    var i = getHash(r.body.tokenOptions.symbol + ":" + n.fid);
    if (await AgentRequest.exists({
      requestHash: i
    })) return t.status(400).json({
      error: "Agent already exists. Please try a different symbol."
    });
    if ((await AgentRequest.find({
      currentOwnerFid: n.fid,
      status: "pending"
    })).some(e => e.createdAt > new Date(Date.now() - 6e5))) return t.status(400).json({
      error: "You already have a pending request. Please try again later."
    });
    if (25 <= await AgentRequest.countDocuments({
      currentOwnerFid: n.fid,
      createdAt: {
        $gte: new Date(Date.now() - 864e5)
      }
    })) return t.status(400).json({
      error: "You have reached the 25 agents limit in the last 24 hours. Please try again later."
    });
    Sentry.captureMessage("Agent request created (/v2/agent-requests)", {
      extra: {
        agentRequest: r.body
      }
    });
    var o = new AgentRequest({
      ...r.body,
      requestHash: i,
      currentOwnerFid: n.fid,
      currentOwnerAddress: getFarcasterUserPrimaryAddress(n),
      currentOwnerUsername: n.username,
      status: "pending",
      type: "CLAN_CREATION"
    });
    await o.save();
    let e = !0;
    return void 0 !== r.body.shouldDeployToken && (e = r.body.shouldDeployToken), 
    s ? createClanTipWrapper({
      currentOwnerFid: n.fid,
      currentOwnerAddress: "0xa679568586Ab40Ce14B187Bc1993DAc1Ba1372C6",
      agentRequestId: o._id,
      shouldDeployTipWrapper: s,
      tokenOptions: {
        ...r.body.tokenOptions
      }
    }) : createClan({
      currentOwnerFid: n.fid,
      currentOwnerAddress: getFarcasterUserPrimaryAddress(n),
      agentRequestId: o._id,
      shouldDeployToken: e,
      tokenOptions: {
        ...r.body.tokenOptions
      }
    }), t.json({
      result: {
        agentRequest: o
      },
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/agent-requests/:id", [ limiter ], async (e, r) => {
  try {
    var t, a = e.params["id"];
    return a ? (t = await AgentRequest.findById(a)) ? r.json({
      result: {
        agentRequest: t
      },
      source: "v2"
    }) : r.status(404).json({
      error: "Agent request not found"
    }) : r.status(400).json({
      error: "Agent request ID is required"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/agent/:tokenAddress", [ limiter ], async (e, r) => {
  try {
    var t, a = e.params["tokenAddress"];
    return a ? (t = await Agent.findOne({
      tokenAddress: a.toLowerCase()
    })) ? r.json({
      result: {
        agentId: t._id,
        tipWrapperAddress: t.tipWrapperAddress
      },
      source: "v2"
    }) : r.status(404).json({
      error: "Agent not found"
    }) : r.status(400).json({
      error: "Token address is required"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
});

const getAgentWithTokenInfo = async (e, r) => {
  var t, a, s, n, i, o;
  return e?.tokenAddress && ([ t, a, s ] = await Promise.all([ BondingErc20.findOne({
    tokenAddress: e.tokenAddress.toLowerCase()
  }), getFarcasterUserByAnyAddress(e.creatorFid?.toString()?.toLowerCase()), BondingErc20Transaction.findOne({
    tokenAddress: e.tokenAddress.toLowerCase()
  }).sort({
    timestamp: -1,
    _id: -1
  }).select("totalSupply") ]), t) && BondingErc20.availableTokens().includes(t.type) ? (s = s?.totalSupply?.replace(/^0+/, "") || "0", 
  n = calculateMarketCap(s), i = weiToUsd(n, r), o = getPricePerToken(s), {
    creatorProfile: e.isAnon ? null : a,
    address: t.tokenAddress,
    name: t.name,
    symbol: t.symbol,
    decimals: t.decimals,
    totalSupply: s,
    marketCapInETH: n.toString(),
    marketCapUSD: i.toString(),
    pricePerToken: o,
    pricePerTokenUSD: weiToUsd(o, r),
    metadata: {
      ...t.metadata,
      image: cleanIpfsImage(t.metadata?.image)
    },
    chainId: parseInt(BASE_CHAIN_ID),
    type: t.type,
    agentId: e._id,
    tipWrapperAddress: e.tipWrapperAddress
  }) : null;
};

app.get("/v2/clans", [ limiter ], async (r, t) => {
  try {
    var {
      cursor: a,
      limit: s = 20,
      query: n
    } = r.query, [ i, o ] = a ? a.split("-") : [ null, null ], d = getHash(`getClans:${a || "initial"}:` + (n || "")), c = await memcache.get(d);
    if (c) return t.json(JSON.parse(c.value));
    var u = {
      type: "CLAN",
      tokenAddress: {
        $exists: !0
      }
    }, l = (n && (u.$or = [ {
      name: {
        $regex: new RegExp(escapeRegExp(n), "i")
      }
    } ]), i && o && (u.$or = [ {
      createdAt: {
        $lt: new Date(Number(i))
      }
    }, {
      createdAt: new Date(Number(i)),
      _id: {
        $lt: o
      }
    } ]), await Agent.find(u).sort({
      createdAt: -1,
      _id: -1
    }).limit(Number(s) + 1)), g = l.length > s, p = g ? l.slice(0, s) : l;
    const v = await oneEthToUsd();
    var m, y = (await Promise.all(p.map(e => getAgentWithTokenInfo(e, v)))).filter(e => e);
    let e = null;
    g && 0 < p.length && (m = p[p.length - 1], e = m.createdAt.getTime() + "-" + m._id);
    var A = {
      clans: y,
      pagination: {
        next: e,
        hasMore: g
      }
    };
    return a ? await memcache.set(d, JSON.stringify(A), {
      lifetime: 30
    }) : await memcache.set(d, JSON.stringify(A), {
      lifetime: 60
    }), t.json(A);
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/clans/:fid", [ limiter ], async (e, r) => {
  try {
    const o = e.params["fid"];
    if (!o) return r.status(400).json({
      error: "FID is required"
    });
    var t = getHash("getClansByFid:" + o), a = await memcache.get(t);
    if (a) return r.json(JSON.parse(a.value));
    const d = (await AgentRequest.find({
      fid: o,
      status: "approved"
    }).select("agentId")).map(e => e.agentId);
    var s, n = await Agent.find({
      $or: [ {
        _id: {
          $in: d
        }
      }, {
        creatorFid: o
      } ],
      type: "CLAN"
    });
    if (!n.length) return s = {
      clans: []
    }, await memcache.set(t, JSON.stringify(s), {
      lifetime: 60
    }), r.json(s);
    const c = await oneEthToUsd();
    var i = {
      clans: (await Promise.all(n.map(e => getAgentWithTokenInfo(e, c)))).map(r => ({
        ...r,
        membership: {
          isCreator: r.creatorFid?.toString() === o,
          isMember: d.some(e => e.equals(r._id))
        }
      }))
    };
    return await memcache.set(t, JSON.stringify(i), {
      lifetime: 60
    }), r.json(i);
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.post("/v2/claim-agent-tips-with-signature", [ heavyLimiter ], async (e, r) => {
  try {
    var {
      address: t,
      chainId: a,
      signature: s,
      agentId: n
    } = e.body;
    if (!(t && a && s && n)) return r.status(400).json({
      error: "Missing required parameters: address, chainId, signature, agentId"
    });
    Sentry.captureMessage("Claiming tips with signature (/v2/claim-agent-tips-with-signature)", {
      extra: {
        address: t,
        chainId: a,
        signature: s,
        agentId: n
      }
    });
    var i = await verifyAddressAndClaimTips({
      address: t.toLowerCase(),
      chainId: a,
      signature: s,
      agentId: n
    });
    return i ? r.json({
      ...i
    }) : r.status(404).json({
      error: "No tips to claim"
    });
  } catch (e) {
    return console.error(e), Sentry.captureException(e), e.message.includes("Invalid signature") ? r.status(401).json({
      error: "Invalid signature or unauthorized address"
    }) : e.message.includes("Agent not found") ? r.status(404).json({
      error: "Agent not found"
    }) : r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/:agentId/tips", [ lightLimiter ], async (e, r) => {
  var t = e.query["address"], e = e.params["agentId"];
  return t && e ? (t = await AgentTip.getTipAmountForFidAndAgentId(t.toLowerCase(), e), 
  r.json({
    tips: t
  })) : r.status(400).json({
    error: "Invalid request, missing address or agentId"
  });
}), app.get("/v2/invite/status", [ limiter ], async (e, r) => {
  var e = e.query["fid"], t = await AgentInvite.findOne({
    fid: e
  }), t = await new _FarcasterV2InviteService().getInviteStatus({
    invite: t,
    position: 0
  }, {
    fid: e
  });
  return r.json({
    status: t
  });
}), module.exports = {
  router: app
};
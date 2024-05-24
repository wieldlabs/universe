const app = require("express").Router(), Sentry = require("@sentry/node"), ethers = require("ethers")["ethers"], rateLimit = require("express-rate-limit"), _CacheService = require("../services/cache/CacheService")["Service"], _FarcasterHubService = require("../services/identities/FarcasterHubService")["Service"], _AlchemyService = require("../services/AlchemyService")["Service"], _AccountRecovererService = require("../services/AccountRecovererService")["Service"], Account = require("../models/Account")["Account"], ApiKey = require("../models/ApiKey")["ApiKey"], axios = require("axios").default, prod = require("../helpers/registrar")["prod"], _MarketplaceService = require("../services/MarketplaceService")["Service"], {
  getFarcasterUserByFid,
  getFarcasterUserByUsername,
  getFarcasterUserByCustodyAddress,
  getFarcasterUserByConnectedAddress,
  getFarcasterCastByHash,
  getFarcasterCastsInThread,
  getFarcasterCasts,
  getFarcasterFollowing,
  getFarcasterFollowers,
  getFarcasterCastReactions,
  getFarcasterCastLikes,
  getFarcasterCastRecasters,
  getFarcasterCastByShortHash,
  getFarcasterFeed,
  getFidByCustodyAddress,
  getFarcasterUnseenNotificationsCount,
  getFarcasterNotifications,
  getFarcasterUserAndLinksByFid,
  getFarcasterUserAndLinksByUsername,
  postMessage,
  searchFarcasterUserByMatch,
  getFarcasterStorageByFid,
  getLeaderboard,
  getFidMetadataSignature,
  createFrame,
  getFrame,
  createReport,
  getFrames,
  getSyncedChannelById,
  getSyncedChannelByUrl,
  searchChannels,
  searchFarcasterCasts,
  getActions,
  createAction
} = require("../helpers/farcaster"), {
  fetchAssetMetadata,
  fetchPriceHistory
} = require("../helpers/wallet"), {
  getInsecureHubRpcClient,
  getSSLHubRpcClient
} = require("@farcaster/hub-nodejs"), requireAuth = require("../helpers/auth-middleware")["requireAuth"], {
  getMemcachedClient,
  getHash
} = require("../connectmemcached"), apiKeyCache = new Map(), getLimit = o => async (e, r) => {
  var t = e.header("API-KEY");
  if (!t) return a = "Missing API-KEY header! Returning 0 for " + e.url, Sentry.captureMessage(a), 
  0;
  var a = getMemcachedClient();
  let s;
  if (apiKeyCache.has(t)) s = apiKeyCache.get(t); else try {
    var n = await a.get(getHash("FarcasterApiKey_getLimit:" + t));
    n && (s = new ApiKey(JSON.parse(n.value)), apiKeyCache.set(t, s));
  } catch (e) {
    console.error(e);
  }
  if (!s && (s = await ApiKey.findOne({
    key: t
  }))) {
    apiKeyCache.set(t, s);
    try {
      await a.set(getHash("FarcasterApiKey_getLimit:" + t), JSON.stringify(s), {
        lifetime: 3600
      });
    } catch (e) {
      console.error(e);
    }
  }
  return s ? Math.ceil(o * s.multiplier) : (n = `API-KEY ${t} not found! Returning 0 for ` + e.url, 
  console.error(n), Sentry.captureMessage(n), 0);
}, limiter = rateLimit({
  windowMs: 3e3,
  max: getLimit(10),
  message: "Too many requests or invalid API key! See docs.far.quest for more info.",
  validate: {
    limit: !1
  }
}), heavyLimiter = rateLimit({
  windowMs: 2e3,
  max: getLimit(1),
  message: "Too many requests or invalid API key! See docs.far.quest for more info.",
  validate: {
    limit: !1
  }
});

let _hubClient;

const getHubClient = () => _hubClient = _hubClient || ("SECURE" === process.env.HUB_SECURE ? getSSLHubRpcClient : getInsecureHubRpcClient)(process.env.HUB_ADDRESS), authContext = async (r, e, t) => {
  var a = getHubClient();
  try {
    if (r.context && r.context.accountId && r.context.hubClient) return t();
    var s = new _FarcasterHubService(), n = await requireAuth(r.headers.authorization || "");
    if (!n.payload.id) throw new Error("jwt must be provided");
    var o = await Account.findById(n.payload.id);
    if (!o) throw new Error(`Account id ${n.payload.id} not found`);
    if (o.deleted) throw new Error(`Account id ${n.payload.id} deleted`);
    var c = n.payload.signerId || await s.getFidByAccount(o, n.payload.isExternal);
    r.context = {
      ...r.context || {},
      accountId: n.payload.id,
      fid: c?.toString().toLowerCase(),
      account: o,
      hubClient: a
    };
  } catch (e) {
    e.message.includes("jwt must be provided") || e.message.includes("jwt malformed") || (Sentry.captureException(e), 
    console.error(e)), r.context = {
      ...r.context || {},
      accountId: null,
      fid: null,
      account: null,
      hubClient: a,
      signerId: null
    };
  }
  t();
};

app.get("/v2/feed", [ authContext, limiter ], async (e, r) => {
  try {
    var t = parseInt(e.query.limit || 20), a = e.query.cursor || null, s = "true" === e.query.explore, [ n, o ] = await getFarcasterFeed({
      limit: t,
      cursor: a,
      context: e.context,
      explore: s
    });
    return r.json({
      result: {
        casts: n
      },
      next: o,
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/cast", [ authContext, limiter ], async (e, r) => {
  try {
    var t, a = e.query.hash;
    return a ? (t = await getFarcasterCastByHash(a, e.context), r.json({
      result: {
        cast: t
      },
      source: "v2"
    })) : r.status(400).json({
      error: "Missing hash"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/cast-short", [ authContext, limiter ], async (e, r) => {
  try {
    var t, a = e.query.shortHash, s = e.query.username;
    return a && s ? (t = await getFarcasterCastByShortHash(a, s, e.context), r.json({
      result: {
        cast: t
      },
      source: "v2"
    })) : r.status(400).json({
      error: "Missing hash or username"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/casts-in-thread", [ authContext, limiter ], async (e, r) => {
  try {
    var t, a, s = e.query.threadHash, n = e.query.parentHash, o = Math.min(e.query.limit || 10, 50), c = e.query.cursor || null;
    return s ? ([ t, a ] = await getFarcasterCastsInThread({
      threadHash: s,
      limit: o,
      cursor: c,
      parentHash: n,
      context: e.context
    }), r.json({
      result: {
        casts: t
      },
      next: a,
      source: "v2"
    })) : r.status(400).json({
      error: "Missing threadHash"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/casts", [ authContext, limiter ], async (e, r) => {
  try {
    var t = e.query.fid, a = JSON.parse(e.query.filters || null), s = e.query.parentChain || null, n = Math.min(e.query.limit || 10, 100), o = e.query.cursor || null, c = "true" === e.query.explore, [ i, u ] = await getFarcasterCasts({
      fid: t,
      parentChain: s,
      limit: n,
      cursor: o,
      context: e.context,
      explore: c,
      filters: a
    });
    return r.json({
      result: {
        casts: i
      },
      next: u,
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/search-casts", [ authContext, heavyLimiter ], async (e, r) => {
  return r.status(503).json({
    error: "This endpoint is unavailable."
  });
}), app.get("/v2/cast-reactions", limiter, async (e, r) => {
  try {
    var t, a, s = e.query.castHash, n = Math.min(parseInt(e.query.limit || 100), 250), o = e.query.cursor || null;
    return s ? ([ t, a ] = await getFarcasterCastReactions(s, n, o), r.json({
      result: {
        reactions: t,
        next: a
      },
      source: "v2"
    })) : r.status(400).json({
      error: "castHash is invalid"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/cast-likes", limiter, async (e, r) => {
  try {
    var t, a, s = e.query.castHash, n = Math.min(parseInt(e.query.limit || 100), 250), o = e.query.cursor || null;
    return s ? ([ t, a ] = await getFarcasterCastLikes(s, n, o), r.json({
      result: {
        likes: t,
        next: a
      },
      source: "v2"
    })) : r.status(400).json({
      error: "castHash is invalid"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/cast-recasters", limiter, async (e, r) => {
  try {
    var t, a, s = e.query.castHash, n = Math.min(parseInt(e.query.limit || 100), 250), o = e.query.cursor || null;
    return s ? ([ t, a ] = await getFarcasterCastRecasters(s, n, o), r.json({
      result: {
        users: t,
        next: a
      },
      source: "v2"
    })) : r.status(400).json({
      error: "castHash is invalid"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/followers", limiter, async (e, r) => {
  try {
    var t, a, s = e.query.fid, n = Math.min(parseInt(e.query.limit || 100), 250), o = e.query.cursor || null;
    return s ? ([ t, a ] = await getFarcasterFollowers(s, n, o), r.json({
      result: {
        users: t,
        next: a
      },
      source: "v2"
    })) : r.status(400).json({
      error: "fid is invalid"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/following", limiter, async (e, r) => {
  try {
    var t, a, s = e.query.fid, n = Math.min(parseInt(e.query.limit || 100), 250), o = e.query.cursor || null;
    return s ? ([ t, a ] = await getFarcasterFollowing(s, n, o), r.json({
      result: {
        users: t,
        next: a
      },
      source: "v2"
    })) : r.status(400).json({
      error: "fid is invalid"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/user-by-address", [ limiter ], async (e, r) => {
  try {
    var t, a, s, n = (e.query.address || "").toLowerCase();
    return !n || n.length < 10 ? r.status(400).json({
      error: "address is invalid"
    }) : ([ t, a ] = await Promise.all([ getFarcasterUserByCustodyAddress(n), getFarcasterUserByFid(n) ]), 
    s = t || a, r.json({
      result: {
        user: s
      },
      source: "v2"
    }));
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/user-by-custody-address", [ limiter ], async (e, r) => {
  try {
    var t, a = (e.query.address || "").toLowerCase();
    return !a || a.length < 10 ? r.status(400).json({
      error: "address is invalid"
    }) : (t = await getFarcasterUserByCustodyAddress(a), r.json({
      result: {
        user: t
      },
      source: "v2"
    }));
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/leaderboard", [ limiter, authContext ], async (e, r) => {
  try {
    var t = await getLeaderboard({
      scoreType: e.query.scoreType,
      limit: e.query.limit,
      context: e.context
    });
    return r.json({
      result: {
        leaderboard: t
      },
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/user-by-connected-address", [ limiter ], async (e, r) => {
  try {
    var t, a = e.query.address || "";
    return !a || a.length < 10 ? r.status(400).json({
      error: "address is invalid"
    }) : (t = await getFarcasterUserByConnectedAddress(a), r.json({
      result: {
        user: t
      },
      source: "v2"
    }));
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/user", [ limiter, authContext ], async (e, r) => {
  try {
    var t, a = e.query.fid;
    return a ? (t = await getFarcasterUserAndLinksByFid({
      fid: a,
      context: e.context
    }), r.json({
      result: {
        user: t
      },
      source: "v2"
    })) : r.status(400).json({
      error: "fid is invalid"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/users", [ limiter, authContext ], async (r, t) => {
  try {
    var e, a = r.query.fids, s = a && a.split(",");
    return a && s ? 100 < s.length ? t.status(400).json({
      error: "fids is invalid"
    }) : (e = await Promise.all(s.map(e => getFarcasterUserAndLinksByFid({
      fid: e,
      context: r.context
    }))), t.json({
      result: {
        users: e
      },
      source: "v2"
    })) : t.status(400).json({
      error: "fids is invalid"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/user-by-username", [ limiter, authContext ], async (e, r) => {
  try {
    var t, a = e.query.username;
    return a ? (t = await getFarcasterUserAndLinksByUsername({
      username: a,
      context: e.context
    }), r.json({
      result: {
        user: t
      },
      source: "v2"
    })) : r.status(400).json({
      error: "username is invalid"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/farquester", [ limiter ], async (e, r) => {
  try {
    var t = await new _CacheService().get({
      key: "FARQUEST_CHARACTER",
      params: {
        address: e.query.address
      }
    });
    return r.json({
      result: t ? {
        imageUrl: t
      } : {},
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.post("/v2/farquester", [ limiter ], async (e, r) => {
  try {
    var t = new _CacheService(), a = e.body.imageUrl;
    return a && e.body.address ? (await t.set({
      key: "FARQUEST_CHARACTER",
      params: {
        address: e.body.address
      },
      value: a,
      expiresAt: null
    }), r.json({
      result: {
        success: !0
      },
      source: "v2"
    })) : r.status(400).json({
      error: "Bad Request - imageUrl is required"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/unseen-notifications-count", [ authContext, limiter ], async (r, t) => {
  try {
    if (!r.context.accountId) return t.status(401).json({
      error: "Unauthorized"
    });
    let e = await new _CacheService().get({
      key: "UNSEEN_NOTIFICATIONS_COUNT",
      params: {
        accountId: r.context.accountId
      }
    });
    e = e || new Date(Date.now() - 6048e5);
    var a = await getFarcasterUnseenNotificationsCount({
      lastSeen: e,
      context: r.context
    });
    return t.json({
      result: {
        unseenCount: a
      },
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.post("/v2/notifications/seen", [ authContext, limiter ], async (e, r) => {
  try {
    if (!e.context.accountId) return r.status(401).json({
      error: "Unauthorized"
    });
    var t = new _CacheService(), a = getMemcachedClient();
    await t.set({
      key: "UNSEEN_NOTIFICATIONS_COUNT",
      params: {
        accountId: e.context.accountId
      },
      value: new Date(),
      expiresAt: null
    });
    try {
      await a.delete("getFarcasterUnseenNotificationsCount:" + e.context.fid, {
        noreply: !0
      });
    } catch (e) {
      console.error(e);
    }
    return r.json({
      result: {
        success: !0
      },
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/notifications", [ authContext, limiter ], async (e, r) => {
  try {
    var t, a, s, n;
    return e.context.accountId ? (t = parseInt(e.query.limit || 100), a = e.query.cursor || null, 
    [ s, n ] = await getFarcasterNotifications({
      limit: t,
      cursor: a,
      context: e.context
    }), r.json({
      result: {
        notifications: s,
        next: n
      },
      source: "v2"
    })) : r.status(401).json({
      error: "Unauthorized"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.post("/v2/message", [ heavyLimiter, authContext ], async (e, t) => {
  if (!e.context.accountId) return t.status(401).json({
    error: "Unauthorized"
  });
  var r = e.context.fid;
  try {
    var a = await postMessage({
      isExternal: e.body.isExternal || r.startsWith("0x") || !1,
      externalFid: r,
      messageJSON: e.body.message,
      hubClient: e.context.hubClient,
      errorHandler: e => {
        Sentry.captureException(e), console.error(e);
      },
      bodyOverrides: e.body.bodyOverrides
    });
    t.json(a);
  } catch (e) {
    Sentry.captureException(e), console.error(e);
    let r = "Internal Server Error";
    e?.message?.includes("no storage") ? r = "No active storage for this FID, buy a storage unit at far.quest!" : e?.message?.includes("invalid signer") && (r = "Invalid signer! If this error persists, try logging out and logging in again."), 
    t.status(500).json({
      error: r
    });
  }
}), app.post("/v3/message", [ heavyLimiter ], async (e, t) => {
  var r = getHubClient(), a = e.body.fid;
  try {
    var s = await postMessage({
      isExternal: e.body.isExternal || a.startsWith("0x") || !1,
      externalFid: a,
      messageJSON: e.body.message,
      hubClient: r,
      errorHandler: e => {
        Sentry.captureException(e), console.error(e);
      },
      bodyOverrides: e.body.bodyOverrides
    });
    t.json(s);
  } catch (e) {
    Sentry.captureException(e), console.error(e);
    let r = "Internal Server Error";
    e?.message?.includes("no storage") ? r = "No active storage for this FID, buy a storage unit at far.quest!" : e?.message?.includes("invalid signer") && (r = "Invalid signer! If this error persists, try logging out and logging in again."), 
    t.status(500).json({
      error: r
    });
  }
}), app.get("/v2/signed-key-requests", limiter, async (e, r) => {
  try {
    var t, a, s = "0x" + e.query.key, n = {
      name: "Farcaster SignedKeyRequestValidator",
      version: "1",
      chainId: 10,
      verifyingContract: "0x00000000fc700472606ed4fa22623acf62c60553"
    }, o = [ {
      name: "requestFid",
      type: "uint256"
    }, {
      name: "key",
      type: "bytes"
    }, {
      name: "deadline",
      type: "uint256"
    } ], c = Math.floor(Date.now() / 1e3) + 86400;
    return process.env.FARCAST_KEY ? (t = await ethers.Wallet.fromMnemonic(process.env.FARCAST_KEY)._signTypedData(n, {
      SignedKeyRequest: o
    }, {
      requestFid: ethers.BigNumber.from(18548),
      key: s,
      deadline: ethers.BigNumber.from(c)
    }), a = (await axios.post("https://api.warpcast.com/v2/signed-key-requests", {
      requestFid: "18548",
      deadline: c,
      key: s,
      signature: t
    }))["data"], r.json({
      result: a.result,
      source: "v2"
    })) : r.status(500).json({
      error: "Not configured"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/search-user-by-match", limiter, async (e, r) => {
  try {
    var t, a = e.query.match, s = Math.min(parseInt(e.query.limit || 10), 50);
    return a ? (t = await searchFarcasterUserByMatch(a, s), r.json({
      result: {
        users: t
      },
      source: "v2"
    })) : r.status(400).json({
      error: "match is invalid"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/get-address-passes", limiter, async (t, a) => {
  try {
    var s = (t.query.address || "").toLowerCase();
    if (!s || s.length < 10) return a.status(400).json({
      error: "address is invalid"
    });
    var n = getMemcachedClient();
    try {
      var o = await n.get("getAddressPasses:" + s);
      if (o) return a.json({
        result: {
          passes: JSON.parse(o.value),
          isHolder: !0
        },
        source: "v2"
      });
    } catch (e) {
      console.error(e);
    }
    var c, i, u = new _AlchemyService({
      apiKey: prod().NODE_URL,
      chain: prod().NODE_NETWORK
    }), l = new _AlchemyService({
      apiKey: prod().OPTIMISM_NODE_URL,
      chain: prod().OPTIMISM_NODE_NETWORK
    });
    let e = null;
    try {
      var y = await n.get("getAddressPasses_isHolder:" + s);
      y && (e = y.value);
    } catch (e) {
      console.error(e);
    }
    if (null === e) {
      e = await l.isHolderOfCollection({
        wallet: s,
        contractAddress: prod().OPTIMISM_REGISTRAR_ADDRESS
      }), e ||= await u.isHolderOfCollection({
        wallet: s,
        contractAddress: prod().REGISTRAR_ADDRESS
      });
      try {
        await n.set("getAddressPasses_isHolder:" + s, JSON.stringify(e), {
          lifetime: e ? 86400 : 10
        });
      } catch (e) {
        console.error(e);
      }
    }
    if (t.query.checkHolderOnly) return a.json({
      result: {
        isHolder: e
      },
      source: "v2"
    });
    let r;
    r = e ? ([ c, i ] = await Promise.all([ u.getNFTs({
      owner: s,
      contractAddresses: [ prod().REGISTRAR_ADDRESS ]
    }), l.getNFTs({
      owner: s,
      contractAddresses: [ prod().OPTIMISM_REGISTRAR_ADDRESS ]
    }) ]), (c?.ownedNfts || []).concat(i?.ownedNfts || []).map(e => {
      let r = e.title;
      return r = r ? r.replace(".beb", "").replace(".cast", "") + ".cast" : null;
    }).filter(e => e && !e.includes("no_metadata"))) : [];
    try {
      await n.set("getAddressPasses:" + s, JSON.stringify(r), {
        lifetime: 60
      });
    } catch (e) {
      console.error(e);
    }
    return a.json({
      result: {
        passes: r
      },
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), a.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/get-farcaster-storage", limiter, async (e, r) => {
  e = await getFarcasterStorageByFid(e.query.fid);
  return r.json({
    result: {
      data: e
    }
  });
}), app.post("/v2/marketplace/listings/complete", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().list(e.body);
    r.json({
      result: {
        listing: t
      },
      success: !0
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.get("/v2/marketplace/listings", [ limiter ], async (e, r) => {
  try {
    var t = new _MarketplaceService(), [ a, s ] = (e.query.limit = Math.min(e.query.limit || 10, 25), 
    await t.getListings({
      ...e.query,
      filters: JSON.parse(e.query.filters || "{}")
    }));
    return r.json({
      listings: a,
      next: s
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.get("/v2/marketplace/stats", [ limiter ], async (e, r) => {
  try {
    var {
      stats: t,
      success: a
    } = await new _MarketplaceService().getStats();
    return r.json({
      stats: t,
      success: a
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.get("/v2/marketplace/listing", [ limiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().getListing(e.query);
    return r.json({
      listing: t
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.get("/v2/marketplace/activities", [ limiter ], async (e, r) => {
  try {
    var [ t, a ] = await new _MarketplaceService().getActivities(e.query);
    return r.json({
      result: {
        activities: t,
        next: a
      }
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.get("/v2/marketplace/offers", [ limiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().getOffers(e.query);
    return r.json({
      result: {
        offers: t
      }
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.get("/v2/marketplace/offer", [ limiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().getOffer(e.query);
    return r.json({
      result: {
        offer: t
      }
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.get("/v2/marketplace/best-offer", [ limiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().getBestOffer(e.query);
    return r.json({
      result: {
        offer: t
      }
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.get("/v2/marketplace/appraisal", [ limiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().getAppraisal(e.query);
    return r.json({
      result: {
        appraisal: t
      }
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.post("/v2/marketplace/appraisal/submit", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().appraise(e.body);
    r.json({
      result: {
        appraisal: t
      },
      success: !0
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.post("/v2/marketplace/listings/buy", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().buy(e.body);
    return r.json({
      success: !0,
      result: {
        listing: t
      }
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.post("/v2/marketplace/listings/cancel", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().cancelListing(e.body);
    return r.json({
      success: !0,
      result: {
        listing: t
      }
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.post("/v2/marketplace/offers/complete", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().offer(e.body);
    r.json({
      result: {
        offer: t
      },
      success: !0
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.post("/v2/marketplace/offers/cancel", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().cancelOffer(e.body);
    r.json({
      result: {
        offer: t
      },
      success: !0
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.post("/v2/marketplace/offers/accept", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().approveOffer(e.body);
    r.json({
      result: {
        offer: t
      },
      success: !0
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.get("/v2/metadata/signature", [ heavyLimiter ], async (e, r) => {
  try {
    var t, {
      publicKey: a,
      deadline: s
    } = e.query;
    return a && s ? (t = await getFidMetadataSignature({
      publicKey: a,
      deadline: s
    }), r.json({
      result: {
        signature: t
      }
    })) : r.status(400).json({
      error: "publicKey and deadline are required"
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.get("/v2/signers", [ heavyLimiter ], async (e, r) => {
  try {
    var t, {
      fid: a,
      state: s
    } = e.query;
    return a ? (t = await new _AccountRecovererService().getSigners(null, {
      fid: a,
      state: s
    }), r.json({
      result: {
        keys: t
      }
    })) : r.status(400).json({
      error: "fid is required"
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.post("/v2/frames", [ heavyLimiter, authContext ], async (e, r) => {
  try {
    if (!e.context.accountId) throw new Error("Unauthorized");
    var t = await createFrame({
      ...e.body
    });
    r.json({
      result: {
        frame: t
      },
      success: !0
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.get("/v2/frames", [ limiter ], async (e, r) => {
  try {
    var t = Math.min(e.query.limit || 10, 100), a = e.query.cursor || null, [ s, n ] = await getFrames({
      limit: t,
      cursor: a
    });
    return r.json({
      result: {
        frames: s
      },
      next: n,
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/frames/:hash", [ limiter ], async (e, r) => {
  try {
    var t = await getFrame(e.params.hash);
    r.json({
      result: {
        frame: t
      }
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.post("/v2/reports", [ heavyLimiter, authContext ], async (e, r) => {
  try {
    if (!e.context.accountId) throw new Error("Unauthorized");
    await createReport(e.body.fid, e.context.fid), r.json({
      success: !0
    });
  } catch (e) {
    console.error(e), r.status(500).json({
      error: e.message
    });
  }
}), app.get("/v2/trends", [ limiter, authContext ], async (r, t) => {
  const s = new _CacheService();
  try {
    var [ e, a ] = await Promise.all([ s.get({
      key: "CastTrendingTokens"
    }), s.get({
      key: "TopTrendingCasts"
    }) ]), n = e || {}, o = Promise.all(Object.entries(n).map(async ([ e, r ]) => {
      var [ t, a ] = await Promise.all([ s.find({
        key: "TrendingHistory",
        params: {
          token: e
        },
        sort: {
          createdAt: -1
        },
        limit: 2
      }), s.find({
        key: "TrendingHistory",
        params: {
          token: e
        },
        sort: {
          createdAt: -1
        },
        limit: 1,
        createdAt: {
          $lte: new Date(Date.now() - 864e5)
        }
      }) ]), a = a[0] || t[1], t = a && a.count ? a.count : r;
      return {
        token: e,
        percentageDifference: 0 === t ? 0 : (r - t) / t * 100,
        count: r,
        lastCount: t,
        lastTimestamp: a?.computedAt || null
      };
    })), c = await Promise.all(a?.casts?.map(e => getFarcasterCastByHash(e.hash, r.context))), [ i, u ] = await Promise.all([ o, c ]), l = u.filter(e => null !== e), y = i.reduce((e, {
      token: r,
      percentageDifference: t,
      count: a,
      lastCount: s,
      lastTimestamp: n
    }) => (e[r] = {
      percentageDifference: t,
      count: a,
      lastCount: s,
      lastTimestamp: n
    }, e), {});
    return t.json({
      result: {
        trends: y,
        casts: l
      },
      source: "v2"
    });
  } catch (e) {
    return console.error("Failed to retrieve CastTrendingTokens from cache:", e), 
    Sentry.captureException(e), t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/trends/:token", [ limiter, authContext ], async (a, s) => {
  var n = new _CacheService();
  try {
    var o = a.params["token"];
    if (!o) return s.status(400).json({
      error: "Token is required"
    });
    var {
      castTimerange: c = "3d",
      tokenTimerange: i = "7d"
    } = a.query;
    let e;
    "1d" === c ? e = 1 : "3d" === c ? e = 3 : "7d" === c && (e = 7);
    var u = new Date(Date.now() - 24 * e * 60 * 60 * 1e3), l = n.find({
      key: "TrendingCastsHistory",
      params: {
        token: o.toUpperCase()
      },
      sort: {
        createdAt: -1
      },
      limit: 1
    }), y = n.find({
      key: "TrendingHistory",
      params: {
        token: o.toUpperCase()
      },
      createdAt: {
        $gt: u
      },
      sort: {
        createdAt: 1
      }
    }), [ p, d ] = await Promise.all([ l, y ]), v = d.map(e => {
      var r = e.count;
      return {
        computedAt: e.computedAt,
        currentCount: r,
        token: e.token,
        network: e.network,
        contractAddress: e.contractAddress
      };
    });
    if (!p || !p[0]) return s.status(404).json({
      error: "No history found for this token"
    });
    var h = p[0]["casts"];
    if (!h || 0 === h.length) return s.status(404).json({
      error: "No casts found in the history for this token"
    });
    var g = [ ...new Set(h?.slice(0, 25).map(e => e.hash)) ], m = (await Promise.all(g.map(e => getFarcasterCastByHash(e, a.context)))).filter(e => null !== e);
    if (0 === m.length) return s.status(404).json({
      error: "Casts not found"
    });
    let r = null, t = [];
    var f, S = v[v.length - 1];
    return S?.contractAddress && (f = await Promise.allSettled([ fetchAssetMetadata(S.network, S.contractAddress), fetchPriceHistory(S.contractAddress, S.network, i) ]), 
    r = "fulfilled" === f[0].status ? f[0].value : null, t = "fulfilled" === f[1].status ? f[1].value : []), 
    s.json({
      result: {
        casts: m,
        trendHistory: v,
        tokenMetadata: r,
        tokenPriceHistory: t
      },
      source: "v2"
    });
  } catch (e) {
    return console.error("Failed to retrieve trends for token:", e), Sentry.captureException(e), 
    s.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/synced-channel/:identifier", async (r, t) => {
  try {
    var {
      identifier: a,
      type: s
    } = r.params;
    if (!a) return t.status(400).json({
      error: "Channel identifier is required"
    });
    let e;
    return (e = "id" === s ? await getSyncedChannelById(a) : "url" !== s && await getSyncedChannelById(a) || await getSyncedChannelByUrl(a)) ? t.json({
      syncedChannel: e
    }) : t.status(404).json({
      error: "Synced channel not found"
    });
  } catch (e) {
    return console.error("Failed to retrieve synced channel:", e), Sentry.captureException(e), 
    t.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/search-channel", async (e, r) => {
  try {
    var t, a = e.query["query"];
    return a ? (t = await searchChannels(a), r.json({
      channels: t
    })) : r.status(400).json({
      error: "Search query is required"
    });
  } catch (e) {
    return console.error("Failed to search channels:", e), Sentry.captureException(e), 
    r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/actions", [ limiter ], async (e, r) => {
  try {
    var t = Math.min(e.query.limit || 10, 100), a = e.query.cursor || null, [ s, n ] = await getActions({
      limit: t,
      cursor: a
    });
    return r.json({
      result: {
        actions: s
      },
      next: n,
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.post("/v2/actions", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await createAction(e.body);
    return r.json({
      result: {
        action: t
      },
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.post("/v2/actions/fetch-action", [ heavyLimiter ], async (e, r) => {
  var {
    proxyUrl: e,
    untrustedData: t,
    trustedData: a
  } = e.body;
  try {
    var s = await axios.post(e, {
      trustedData: a,
      untrustedData: t
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    return r.json({
      result: s.data,
      type: s.data.type || "message",
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), r.status(500).json({
      error: e.message || e.response?.data?.message || "Internal Server Error"
    });
  }
}), module.exports = {
  router: app
};
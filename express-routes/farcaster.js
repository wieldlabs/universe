const app = require("express").Router(), Sentry = require("@sentry/node"), ethers = require("ethers")["ethers"], rateLimit = require("express-rate-limit"), _CacheService = require("../services/cache/CacheService")["Service"], _FarcasterHubService = require("../services/identities/FarcasterHubService")["Service"], _AccountRecovererService = require("../services/AccountRecovererService")["Service"], Account = require("../models/Account")["Account"], ApiKey = require("../models/ApiKey")["ApiKey"], axios = require("axios").default, prod = require("../helpers/registrar")["prod"], _MarketplaceService = require("../services/MarketplaceService")["Service"], {
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
  getFrame,
  createReport,
  getFrames,
  getSyncedChannelById,
  getSyncedChannelByUrl,
  searchChannels,
  searchFarcasterCasts,
  getActions,
  createAction,
  getFarPay,
  updateFarPay,
  getFarcasterFidByCustodyAddress,
  getFarpayDeeplink,
  getFarcasterUserByAnyAddress,
  getFarcasterL1UserByAnyAddress
} = require("../helpers/farcaster"), {
  fetchAssetMetadata,
  fetchPriceHistory
} = require("../helpers/wallet"), {
  getInsecureHubRpcClient,
  getSSLHubRpcClient
} = require("@farcaster/hub-nodejs"), {
  Alchemy,
  Network
} = require("alchemy-sdk"), requireAuth = require("../helpers/auth-middleware")["requireAuth"], {
  memcache,
  getHash
} = require("../connectmemcache"), _ScoreService = require("../services/ScoreService")["Service"], getFartapScoreType = require("../helpers/fartap")["getFartapScoreType"], {
  getAddressPasses,
  getAddressInventory,
  getListingDetails
} = require("../helpers/farcaster-utils"), _FarcasterV2InviteService = require("../services/farcaster/FarcasterV2InviteService")["Service"], {
  AgentRequest,
  AgentAuthorization
} = require("../models/farcaster/agents"), getLimit = require("./apikey")["getLimit"], lightLimiter = rateLimit({
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

let _hubClient;

const getHubClient = () => _hubClient = _hubClient || ("SECURE" === process.env.HUB_SECURE ? getSSLHubRpcClient : getInsecureHubRpcClient)(process.env.HUB_ADDRESS), authContext = async (r, e, t) => {
  var a = getHubClient();
  try {
    if (r.context && r.context.accountId && r.context.hubClient) return t();
    var s = new _FarcasterHubService(), n = await requireAuth(r.headers.authorization || "");
    if (!n.payload.id) throw new Error("jwt must be provided");
    var o = await Account.findByIdCached(n.payload.id);
    if (!o) throw new Error(`Account id ${n.payload.id} not found`);
    if (o.deleted) throw new Error(`Account id ${n.payload.id} deleted`);
    var i = "true" === r.headers.external, c = (!i && n.payload.signerId || await s.getFidByAccountId(n.payload.id, n.payload.isExternal, i))?.toString().toLowerCase(), u = new _CacheService();
    (!await u.get({
      key: "enableNotifications_" + c
    }) || Math.random() < .01) && u.set({
      key: "enableNotifications_" + c,
      value: "1",
      expiresAt: new Date(Date.now() + 7776e6)
    }), r.context = {
      ...r.context || {},
      accountId: n.payload.id,
      fid: c,
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

app.get("/v2/feed", [ limiter, authContext ], async (e, r) => {
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
}), app.get("/v2/cast", [ limiter, authContext ], async (e, r) => {
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
}), app.get("/v2/cast-short", [ limiter, authContext ], async (e, r) => {
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
}), app.get("/v2/casts-in-thread", [ limiter, authContext ], async (e, r) => {
  try {
    var t, a, s = e.query.threadHash, n = e.query.parentHash, o = Math.min(e.query.limit || 10, 50), i = e.query.cursor || null;
    return s ? ([ t, a ] = await getFarcasterCastsInThread({
      threadHash: s,
      limit: o,
      cursor: i,
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
}), app.get("/v2/casts", [ limiter, authContext ], async (e, r) => {
  try {
    var t = e.query.fid, a = JSON.parse(e.query.filters || null), s = e.query.parentChain || null, n = Math.min(e.query.limit || 10, 100), o = e.query.cursor || null, i = "true" === e.query.explore, [ c, u ] = await getFarcasterCasts({
      fid: t,
      parentChain: s,
      limit: n,
      cursor: o,
      context: e.context,
      explore: i,
      filters: a
    });
    return r.json({
      result: {
        casts: c
      },
      next: u,
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/search-casts", [ heavyLimiter, authContext ], async (e, r) => {
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
    var t, a = (e.query.address || "").toLowerCase(), s = "false" === e.query.external;
    return !a || a.length < 10 ? r.status(400).json({
      error: "address is invalid"
    }) : (t = s ? await getFarcasterL1UserByAnyAddress(a) : await getFarcasterUserByAnyAddress(a), 
    r.json({
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
}), app.get("/v2/leaderboard", [ limiter, authContext ], async (r, t) => {
  try {
    let e = r.query.scoreType;
    "fartap" === e && (e = await getFartapScoreType());
    var a, s = await getLeaderboard({
      scoreType: e,
      limit: r.query.limit
    }), n = new _ScoreService();
    return r.query.address ? (a = await n.getPosition({
      address: r.query.address,
      bebdomain: r.query.scoreType
    }), t.json({
      result: {
        leaderboard: s,
        position: a
      },
      source: "v2"
    })) : t.json({
      result: {
        leaderboard: s
      },
      source: "v2"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), t.status(500).json({
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
}), app.get("/v2/unseen-notifications-count", [ limiter, authContext ], async (r, t) => {
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
}), app.post("/v2/notifications/seen", [ limiter, authContext ], async (e, r) => {
  try {
    return e.context.accountId ? (await new _CacheService().set({
      key: "UNSEEN_NOTIFICATIONS_COUNT",
      params: {
        accountId: e.context.accountId
      },
      value: new Date(),
      expiresAt: null
    }), await memcache.delete("getFarcasterUnseenNotificationsCount:" + e.context.fid, {
      noreply: !0
    }), r.json({
      result: {
        success: !0
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
}), app.get("/v2/notifications", [ limiter, authContext ], async (e, r) => {
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
    } ], i = Math.floor(Date.now() / 1e3) + 86400;
    return process.env.FARCAST_KEY ? (t = await ethers.Wallet.fromMnemonic(process.env.FARCAST_KEY)._signTypedData(n, {
      SignedKeyRequest: o
    }, {
      requestFid: ethers.BigNumber.from(18548),
      key: s,
      deadline: ethers.BigNumber.from(i)
    }), a = (await axios.post("https://api.warpcast.com/v2/signed-key-requests", {
      requestFid: "18548",
      deadline: i,
      key: s,
      signature: t
    }))["data"], r.json({
      result: a.result,
      source: "v2"
    })) : (console.error("FARCAST_KEY not configured"), r.status(500).json({
      error: "Not configured"
    }));
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/search-user-by-match", heavyLimiter, async (e, r) => {
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
}), app.get("/v2/get-address-passes", limiter, async (e, r) => {
  try {
    var t, a, s = (e.query.address || "").toLowerCase();
    return !s || s.length < 10 ? r.status(400).json({
      error: "address is invalid"
    }) : ({
      isHolder: t,
      passes: a
    } = await getAddressPasses(s, e.query.checkHolderOnly), e.query.checkHolderOnly ? r.json({
      result: {
        isHolder: t
      },
      source: "v2"
    }) : r.json({
      result: {
        passes: a,
        isHolder: t
      },
      source: "v2"
    }));
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
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
}), app.get("/v2/marketplace/listing/details", [ limiter ], async (e, r) => {
  try {
    var {
      listing: t,
      userData: a,
      offers: s,
      history: n
    } = await getListingDetails(e.query);
    return r.json({
      listing: t,
      userData: a,
      offers: s,
      history: n
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
    })), i = await Promise.all(a?.casts?.map(e => getFarcasterCastByHash(e.hash, r.context))), [ c, u ] = await Promise.all([ o, i ]), l = u.filter(e => null !== e), y = c.reduce((e, {
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
        ...r.query.onlyTrends ? {} : {
          casts: l
        }
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
      castTimerange: i = "3d",
      tokenTimerange: c = "7d"
    } = a.query;
    let e;
    "1d" === i ? e = 1 : "3d" === i ? e = 3 : "7d" === i && (e = 7);
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
    var g = p[0]["casts"];
    if (!g || 0 === g.length) return s.status(404).json({
      error: "No casts found in the history for this token"
    });
    var m = [ ...new Set(g?.slice(0, 25).map(e => e.hash)) ], h = (await Promise.all(m.map(e => getFarcasterCastByHash(e, a.context)))).filter(e => null !== e);
    if (0 === h.length) return s.status(404).json({
      error: "Casts not found"
    });
    let r = null, t = [];
    var f, S = v[v.length - 1];
    return S?.contractAddress && (f = await Promise.allSettled([ fetchAssetMetadata(S.network, S.contractAddress), fetchPriceHistory(S.contractAddress, S.network, c) ]), 
    r = "fulfilled" === f[0].status ? f[0].value : null, t = "fulfilled" === f[1].status ? f[1].value : []), 
    s.json({
      result: {
        casts: h,
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
}), app.get("/v2/get-fid-stats", [ limiter ], async (r, t) => {
  try {
    var a = r.query.fid;
    if (!a) throw new Error("Fid not found");
    var s, n = [ getFarcasterFidByCustodyAddress(a), getFarcasterUserByFid(a), getFarcasterStorageByFid(a) ], [ o, i, c ] = await Promise.all(n);
    let e = !1;
    r.query.signer && (s = new _AccountRecovererService(), e = await s.verifyFarcasterSignerAndGetFid(null, {
      signerAddress: r.query.signer,
      fid: o || i?.fid
    })), t.status(201).json({
      code: "201",
      success: !0,
      message: "Success",
      stats: {
        hasFid: o || !i?.external,
        storage: c,
        validSigner: !!e
      }
    });
  } catch (e) {
    Sentry.captureException(e), console.error(e), t.status(500).json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), app.get("/v2/farpay/:uniqueId", [ lightLimiter ], async (e, r) => {
  try {
    var t = e.params["uniqueId"], a = await getFarPay(t);
    return r.json({
      farPay: a
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.post("/v2/farpay", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await updateFarPay(e.body);
    return r.json({
      farPay: t
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.post("/v2/farpay/deeplink", [ lightLimiter ], async (e, r) => {
  try {
    var {
      txId: t,
      data: a,
      callbackUrl: s
    } = e.body, {
      deepLinkUrl: n,
      uniqueId: o
    } = await getFarpayDeeplink({
      txId: t,
      data: a,
      callbackUrl: s
    });
    return r.json({
      deepLinkUrl: n,
      uniqueId: o
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.post("/v2/marketplace/listings/nft/complete", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().listTokenId(e.body);
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
}), app.post("/v2/marketplace/listings/nft/buy", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().buyTokenId(e.body);
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
}), app.post("/v2/marketplace/listings/nft/cancel", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().cancelListTokenId(e.body);
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
}), app.post("/v2/marketplace/offers/nft/complete", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().offerTokenId(e.body);
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
}), app.post("/v2/marketplace/offers/nft/cancel", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().cancelOfferTokenId(e.body);
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
}), app.post("/v2/marketplace/offers/nft/accept", [ heavyLimiter ], async (e, r) => {
  try {
    var t = await new _MarketplaceService().approveOfferTokenId(e.body);
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
}), app.get("/v2/inventory", [ limiter ], async (e, r) => {
  try {
    var t, a, s, n, {
      address: o,
      limit: i = 100,
      cursor: c = null,
      filters: u = {},
      sort: l
    } = e.query;
    return !o || o.length < 10 ? r.status(400).json({
      error: "address is invalid"
    }) : (t = parseInt(i) || 100, a = "string" == typeof u ? JSON.parse(u) : u, 
    [ s, n ] = await getAddressInventory({
      address: o,
      limit: t,
      cursor: c,
      filters: a,
      sort: l
    }), r.json({
      result: {
        inventory: s
      },
      nextCursor: n,
      source: "v2"
    }));
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/marketplace/listings/history", [ limiter ], async (e, r) => {
  try {
    var t, {
      fid: a,
      tokenId: s,
      chainId: n,
      timerange: o
    } = e.query;
    return a || s ? (t = await new _MarketplaceService().getHistoricalSales({
      fid: a || void 0,
      tokenId: s || void 0,
      chainId: n ? parseInt(n) : void 0,
      timerange: o || "30d"
    }), r.json({
      result: t,
      success: !0
    })) : r.status(400).json({
      error: "Either fid or tokenId is required"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error",
      success: !1
    });
  }
}), app.get("/v3/trends", [ limiter, authContext ], async (e, r) => {
  const i = new _CacheService();
  try {
    var [ t ] = await Promise.all([ i.get({
      key: "CastTrendingTokensV2"
    }) ]), a = t || {}, s = (await Promise.all(Object.entries(a).map(async ([ e, r ]) => {
      var [ t, a, s ] = await Promise.all([ i.find({
        key: "TrendingHistory",
        params: {
          token: e
        },
        sort: {
          createdAt: -1
        },
        limit: 1,
        createdAt: {
          $lte: new Date(Date.now() - 54e5)
        }
      }), i.find({
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
      }), i.find({
        key: "TrendingHistory",
        params: {
          token: e
        },
        sort: {
          createdAt: -1
        },
        limit: 1,
        createdAt: {
          $lte: new Date(Date.now() - 6048e5)
        }
      }) ]), t = t[0]?.count || 0, n = a[0]?.count || 0, s = s[0]?.count || 0, o = {
        "1h": r.count - t,
        "1d": r.count - n,
        "1w": r.count - s
      };
      return {
        token: e,
        difference: o,
        percentageDifference: {
          "1h": 0 === t ? 100 : o["1h"] / t * 100,
          "1d": 0 === n ? 100 : o["1d"] / n * 100,
          "1w": 0 === s ? 100 : o["1w"] / s * 100
        },
        count: r.count,
        metrics: r,
        lastTimestamp: a[0]?.computedAt || null
      };
    }))).reduce((e, {
      token: r,
      difference: t,
      percentageDifference: a,
      count: s,
      lastTimestamp: n,
      metrics: o
    }) => (e[r] = {
      percentageDifference: a,
      count: s,
      difference: t,
      lastTimestamp: n,
      metrics: o
    }, e), {});
    return r.json({
      result: {
        trends: s
      },
      source: "v3"
    });
  } catch (e) {
    return console.error("Failed to retrieve trending data:", e), Sentry.captureException(e), 
    r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.get("/v2/invites/status", [ limiter, authContext ], async (e, r) => {
  try {
    var t;
    return e.context.accountId ? (t = await new _FarcasterV2InviteService().getQuestProgress(e.context), 
    r.json({
      result: t,
      source: "v2"
    })) : r.status(401).json({
      error: "Unauthorized"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: "Internal Server Error"
    });
  }
}), app.post("/v2/invites/complete-quest", [ limiter, authContext ], async (e, r) => {
  try {
    var t, a;
    return e.context.accountId ? (t = e.body["questId"], t ? (a = await new _FarcasterV2InviteService().completeQuest(t, e.context), 
    r.json({
      result: a,
      source: "v2"
    })) : r.status(400).json({
      error: "Quest ID is required"
    })) : r.status(401).json({
      error: "Unauthorized"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: e.message || "Internal Server Error"
    });
  }
}), app.post("/v2/invites/apply", [ limiter, authContext ], async (e, r) => {
  try {
    var t, a, s;
    return e.context.accountId ? ({
      inviteCode: t,
      referralType: a = "WEB"
    } = e.body, t ? (s = await new _FarcasterV2InviteService().applyInvite({
      inviteCode: t,
      referralType: a
    }, e.context), r.json({
      result: s,
      source: "v2"
    })) : r.status(400).json({
      error: "Invite code is required"
    })) : r.status(401).json({
      error: "Unauthorized"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.status(500).json({
      error: e.message || "Internal Server Error"
    });
  }
}), app.post("/v2/invites/validate", [ limiter ], async (e, r) => {
  try {
    var t = e.body["inviteCode"], a = await new _FarcasterV2InviteService().validateInviteV2Code(t);
    r.json({
      success: !0,
      isValid: a
    });
  } catch (e) {
    console.error("Error validating invite code:", e), r.status(400).json({
      success: !1,
      error: e.message
    });
  }
}), module.exports = {
  router: app,
  farcasterAuthContext: authContext
};
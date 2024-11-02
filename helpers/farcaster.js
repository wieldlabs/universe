const {
  Messages,
  Casts,
  Reactions,
  Signers,
  Verifications,
  UserData,
  Fids,
  Fnames,
  Links,
  UserDataType,
  ReactionType,
  Notifications,
  MessageType,
  Listings,
  Storage,
  Frames,
  Reports,
  SyncedChannels,
  SyncedActions,
  FarPay
} = require("../models/farcaster"), CastHandle = require("../models/CastHandle")["CastHandle"], mongoose = require("mongoose"), Score = require("../models/Score")["Score"], _AlchemyService = require("../services/AlchemyService")["Service"], {
  config,
  prod
} = require("../helpers/registrar"), getHexTokenIdFromLabel = require("../helpers/get-token-id-from-label")["getHexTokenIdFromLabel"], ethers = require("ethers")["ethers"], {
  memcache,
  getHash
} = require("../connectmemcache"), {
  Message,
  fromFarcasterTime
} = require("@farcaster/hub-nodejs"), bs58 = require("bs58"), axios = require("axios"), Sentry = require("@sentry/node");

async function isFollowingChannel(e, a) {
  let t = "";
  do {
    var r = await axios.get(`https://client.warpcast.com/v2/user-following-channels?fid=${e}&limit=50&cursor=` + t, {
      headers: {
        Authorization: "Bearer " + process.env.FARQUEST_FARCASTER_APP_TOKEN
      }
    });
    if (r.data.result.channels.find(e => e.key === a)) return !0;
    t = r.data.next?.cursor;
  } while (t);
  return !1;
}

function farcasterTimeToDate(e) {
  if (void 0 !== e) {
    if (null === e) return null;
    e = fromFarcasterTime(e);
    if (e.isErr()) throw e.error;
    return new Date(e.value);
  }
}

function bytesToHex(e) {
  if (void 0 !== e) return null === e ? null : "0x" + Buffer.from(e).toString("hex");
}

function escapeRegExp(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const getSyncedChannelById = async e => {
  var a, t;
  return e ? (a = "syncedChannel:" + e, (t = await memcache.get(a)) ? JSON.parse(t.value) : ((t = await SyncedChannels.findOne({
    channelId: e
  })) && await memcache.set(a, JSON.stringify(t), {
    lifetime: 21600
  }), t)) : null;
}, getSyncedChannelByUrl = async e => {
  var a, t;
  return e ? (a = "syncedChannel:" + e, (t = await memcache.get(a)) ? JSON.parse(t.value) : ((t = await SyncedChannels.findOne({
    url: e
  })) && await memcache.set(a, JSON.stringify(t), {
    lifetime: 21600
  }), t)) : null;
}, searchChannels = async e => {
  var a, t;
  return e ? (a = getHash("searchChannels:" + e), (t = await memcache.get(a)) ? JSON.parse(t.value) : (0 < (t = await SyncedChannels.aggregate([ {
    $match: {
      channelId: {
        $regex: new RegExp("^" + escapeRegExp(e), "i")
      }
    }
  }, {
    $addFields: {
      channelIdLength: {
        $strLenCP: "$channelId"
      }
    }
  }, {
    $sort: {
      channelIdLength: 1
    }
  }, {
    $limit: 10
  } ])).length && await memcache.set(a, JSON.stringify(t), {
    lifetime: 21600
  }), t)) : [];
}, postMessage = async ({
  isExternal: t = !1,
  externalFid: r,
  messageJSON: s,
  hubClient: i,
  errorHandler: a = e => console.error(e),
  bodyOverrides: n
}) => {
  try {
    let e = t, a = Message.fromJSON(s);
    var l, c;
    if (!e && [ MessageType.MESSAGE_TYPE_CAST_ADD, MessageType.MESSAGE_TYPE_CAST_REMOVE ].includes(a.type) && (a.data.type == MessageType.MESSAGE_TYPE_CAST_ADD && a.data.castAddBody.parentCastId ? (l = await Casts.findOne({
      hash: bytesToHex(a.data.castAddBody.parentCastId.hash)
    }), e = l?.external || e) : a.data.type == MessageType.MESSAGE_TYPE_CAST_REMOVE && (c = await Casts.findOne({
      hash: bytesToHex(a.data.castRemoveBody.targetHash)
    }), e = c?.external || e)), e && a.data.type === MessageType.MESSAGE_TYPE_USER_DATA_ADD && a.data.userDataBody.type === UserDataType.USER_DATA_TYPE_USERNAME) {
      new _AlchemyService({
        apiKey: prod().NODE_URL,
        chain: prod().NODE_NETWORK
      }), new _AlchemyService({
        apiKey: prod().OPTIMISM_NODE_URL,
        chain: prod().OPTIMISM_NODE_NETWORK
      });
      let e = Buffer.from(a.data.userDataBody.value).toString("ascii").replace(".beb", "").replace(".cast", "");
      e.includes(".op") && (e = "op_" + e.replace(".op", ""));
      var d = getHexTokenIdFromLabel(e);
      if (!await CastHandle.exists({
        owner: r?.toLowerCase(),
        tokenId: d.toLowerCase()
      })) {
        var o = `Invalid UserData for external user, could not find ${e}/${d} in CastHandles!`;
        if ("production" === process.env.NODE_ENV) throw new Error(o);
        console.error(o);
      }
    }
    if (!e) {
      var g = await i.submitMessage(a), m = g.unwrapOr(null);
      if (!m) throw new Error("Could not send message: " + g?.error);
      a = {
        ...m,
        hash: m.hash,
        signer: m.signer
      };
    }
    var u = new Date(), h = {
      fid: e ? r : a.data.fid,
      createdAt: u,
      updatedAt: u,
      messageType: a.data.type,
      timestamp: farcasterTimeToDate(a.data.timestamp),
      hash: bytesToHex(a.hash),
      hashScheme: a.hashScheme,
      signature: bytesToHex(a.signature),
      signatureScheme: a.signatureScheme,
      signer: bytesToHex(a.signer),
      raw: bytesToHex(Message.encode(a).finish()),
      external: e,
      unindexed: !0,
      bodyOverrides: n
    };
    try {
      await Messages.create(h);
    } catch (e) {
      if (11e3 !== (e?.code || 0)) throw e;
      console.error("Message with this hash already exists, skipping!");
    }
    return {
      result: h,
      source: "v2"
    };
  } catch (e) {
    throw a(e), e;
  }
}, GLOBAL_SCORE_THRESHOLD = 50, GLOBAL_SCORE_THRESHOLD_CHANNEL = 5, getFarcasterUserByFid = async e => {
  var a = await memcache.get("getFarcasterUserByFid:" + e);
  if (a) return JSON.parse(a.value);
  if (!e) return null;
  var [ a, t, r, s, i, n ] = await Promise.all([ getFarcasterFollowingCount(e), getFarcasterFollowersCount(e), UserData.find({
    fid: e,
    deletedAt: null
  }).sort({
    createdAt: 1
  }), Fids.findOne({
    fid: e,
    deletedAt: null
  }), getConnectedAddressForFid(e), getConnectedAddressesForFid(e) ]), l = e.toString().startsWith("0x") || !1;
  if (!s && !l) return null;
  var c = {
    fid: e.toString().toLowerCase(),
    followingCount: a,
    followerCount: t,
    pfp: {
      url: "",
      verified: !1
    },
    bio: {
      text: "",
      mentions: []
    },
    external: l,
    custodyAddress: s?.custodyAddress,
    connectedAddress: i,
    allConnectedAddresses: n
  };
  let d = s?.timestamp;
  var o = {};
  for (const y of r) {
    d = d || y.createdAt, y.createdAt < d && (d = y.createdAt);
    var g = y.value.startsWith("0x") ? y.value.slice(2) : y.value, m = Buffer.from(g, "hex").toString("utf8");
    switch (y.type) {
     case UserDataType.USER_DATA_TYPE_USERNAME:
      o.username || (c.username = m, o.username = !0);
      break;

     case UserDataType.USER_DATA_TYPE_DISPLAY:
      o.displayName || (c.displayName = m, o.displayName = !0);
      break;

     case UserDataType.USER_DATA_TYPE_PFP:
      o.pfp || (c.pfp.url = m, o.pfp = !0);
      break;

     case UserDataType.USER_DATA_TYPE_BIO:
      if (!o.bio) {
        c.bio.text = m;
        for (var u, h = /(?<!\]\()@([a-zA-Z0-9_\-]+(\.[a-z]{2,})*)/g; u = h.exec(m); ) c.bio.mentions.push(u[1]);
        o.bio = !0;
      }
      break;

     case UserDataType.USER_DATA_TYPE_URL:
      o.url || (c.url = m, o.url = !0);
    }
  }
  return c.registeredAt = d?.getTime(), await memcache.set("getFarcasterUserByFid:" + e, JSON.stringify(c)), 
  c;
}, getFarcasterUserAndLinksByFid = async ({
  fid: e,
  context: a
}) => {
  var t = await getFarcasterUserByFid(e);
  if (!a.fid || e === a.fid) return t;
  if (!t) return null;
  let r;
  var s, i = await memcache.get(`getFarcasterUserAndLinksByFid_${a.fid}:` + e);
  return (r = i ? JSON.parse(i.value) : r) || ([ i, s ] = await Promise.all([ Links.exists({
    fid: a.fid,
    targetFid: e,
    type: "follow",
    deletedAt: null
  }), Links.exists({
    fid: e,
    targetFid: a.fid,
    type: "follow",
    deletedAt: null
  }) ]), r = {
    isFollowing: i,
    isFollowedBy: s
  }, await memcache.set(`getFarcasterUserAndLinksByFid_${a.fid}:` + e, JSON.stringify(r))), 
  {
    ...t,
    ...r
  };
}, getFarcasterUserByCustodyAddress = async e => {
  return (e = e && await Fids.findOne({
    custodyAddress: e,
    deletedAt: null
  })) ? getFarcasterUserByFid(e.fid) : null;
}, getFarcasterFidByCustodyAddress = async e => {
  var a;
  return e ? (a = await memcache.get("getFarcasterFidByCustodyAddress:" + e)) ? "" === a.value ? null : a.value : (a = (await Fids.findOne({
    custodyAddress: e,
    deletedAt: null
  }))?.fid || null, await memcache.set("getFarcasterFidByCustodyAddress:" + e, a || ""), 
  a) : null;
}, getFarcasterUserByAddress = async e => {
  var [ e, a ] = await Promise.all([ getFarcasterUserByCustodyAddress(e), getFarcasterUserByFid(e) ]);
  return e || a;
}, getFarcasterUserByConnectedAddress = async a => {
  let t = null;
  var r = await memcache.get("getFarcasterUserByConnectedAddress_fid:" + a);
  if (!(t = r ? r.value : t)) {
    r = "0x" === a.slice(0, 2);
    let e = a.toLowerCase();
    if (!r) try {
      e = "0x" + Buffer.from(bs58.decode(a)).toString("hex");
    } catch (e) {
      console.error("Error decoding solana address, fallback to hex", e);
    }
    r = await Verifications.findOne({
      "claimObj.address": e,
      deletedAt: null
    });
    t = r ? r.fid : "0";
  }
  return await memcache.set("getFarcasterUserByConnectedAddress_fid:" + a, t), "0" !== t ? getFarcasterUserByFid(t) : null;
}, getConnectedAddressForFid = async e => {
  var a;
  return e ? (a = await memcache.get("getConnectedAddressForFid:" + e)) ? a.value : (a = await Verifications.findOne({
    fid: e,
    deletedAt: null,
    $or: [ {
      "claimObj.protocol": {
        $exists: !1
      }
    }, {
      "claimObj.protocol": 0
    } ]
  }).sort({
    timestamp: 1
  })) && (a = a.claimObj || JSON.parse(a.claim)) ? (await memcache.set("getConnectedAddressForFid:" + e, a.address.toLowerCase()), 
  a.address) : null : null;
}, getConnectedAddressesForFid = async e => {
  if (!e) return [];
  var a = await memcache.get("getConnectedAddressesForFid:" + e);
  if (a) return JSON.parse(a.value);
  a = (await Verifications.find({
    fid: e,
    deletedAt: null
  })).map(a => {
    a = a.claimObj || JSON.parse(a.claim);
    if (1 === a.protocol) try {
      return [ "solana", bs58.encode(Buffer.from(a.address.slice(2), "hex")).toString() ];
    } catch (e) {
      return console.error("Error encoding solana address, fallback to hex", e), 
      [ "solana", a.address.toLowerCase() ];
    }
    return [ "ethereum", a.address.toLowerCase() ];
  });
  const t = {
    ethereum: new Set(),
    solana: new Set()
  };
  return a.forEach(e => {
    t[e[0]].add(e[1]);
  }), Object.keys(t).forEach(e => {
    t[e] = Array.from(t[e]);
  }), await memcache.set("getConnectedAddressesForFid:" + e, JSON.stringify(t)), 
  t;
}, getCustodyAddressByFid = async e => {
  var a;
  return e ? (a = await memcache.get("getCustodyAddressByFid:" + e)) ? a.value : (a = await Fids.findOne({
    fid: e,
    deletedAt: null
  })) ? (await memcache.set("getCustodyAddressByFid:" + e, a.custodyAddress), a.custodyAddress) : null : null;
}, getFidByCustodyAddress = async e => {
  var a;
  return e ? (a = await memcache.get("getFidByCustodyAddress:" + e)) ? a.value : (a = await Fids.findOne({
    custodyAddress: e,
    deletedAt: null
  })) ? (await memcache.set("getFidByCustodyAddress:" + e, a.fid), a.fid) : null : null;
}, searchFarcasterUserByMatch = async (a, e = 10, t = "text", r = !0) => {
  if (!a) return [];
  var s = escapeRegExp(a.toLowerCase());
  let i = "searchFarcasterUserByMatch:" + a;
  r || (i += ":noExternal");
  var n = await memcache.get(getHash(i));
  if (n) return JSON.parse(n.value);
  var [ n, s, t ] = await Promise.all([ (async () => {
    var e = await UserData.findOne({
      fid: a,
      deletedAt: null,
      ...r ? {} : {
        external: !1
      }
    }).read("secondaryPreferred");
    return e ? [ e ] : [];
  })(), "development" === process.env.NODE_ENV ? UserData.find({
    text: {
      $regex: "^" + s
    },
    type: UserDataType.USER_DATA_TYPE_USERNAME,
    deletedAt: null,
    ...r ? {} : {
      external: !1
    }
  }).read("secondaryPreferred").limit(2 < e ? Math.ceil(e / 2) : 1).sort(t) : (async () => {
    try {
      return await UserData.aggregate().search({
        text: {
          query: a,
          path: "text",
          fuzzy: {
            maxEdits: 2,
            prefixLength: 0,
            maxExpansions: 50
          },
          score: {
            function: {
              multiply: [ {
                path: {
                  value: "type",
                  undefined: 1
                }
              }, {
                score: "relevance"
              } ]
            }
          }
        },
        index: "search-userdata"
      }).limit(e);
    } catch (e) {
      return console.error("Error searching userdata", e), Sentry.captureException(e), 
      [];
    }
  })(), "development" === process.env.NODE_ENV ? UserData.find({
    text: {
      $regex: "^" + s,
      $options: "i"
    },
    type: UserDataType.USER_DATA_TYPE_DISPLAY,
    deletedAt: null,
    ...r ? {} : {
      external: !1
    }
  }).read("secondaryPreferred").limit(2 < e ? Math.ceil(e / 2) : 1).sort(t) : [] ]), n = [ ...n, ...s, ...t ];
  const l = {};
  s = n.map(e => l[e.fid] ? null : (l[e.fid] = !0, e.fid)).filter(e => null !== e), 
  t = await Promise.all(s.map(e => getFarcasterUserByFid(e)));
  return await memcache.set(getHash(i), JSON.stringify(t), {
    lifetime: 300
  }), t;
}, getFarcasterFidByUsername = async e => {
  let a;
  var t = await memcache.get("getFarcasterFidByUsername:" + e);
  return (a = t ? t.value : a) || (t = await Fnames.findOne({
    fname: e,
    deletedAt: null
  })) && (a = t.fid || await getFidByCustodyAddress(t.custodyAddress)), a || (t = "0x" + Buffer.from(e, "ascii").toString("hex"), 
  t = await UserData.findOne({
    value: t,
    type: UserDataType.USER_DATA_TYPE_USERNAME,
    deletedAt: null
  }).sort({
    createdAt: -1
  }), a = t?.fid), a ? (await memcache.set("getFarcasterFidByUsername:" + e, a), 
  a) : null;
}, getFarcasterUserByUsername = async (e, a = 0) => {
  e = await getFarcasterFidByUsername(e);
  return e ? getFarcasterUserByFid(e) : null;
}, getFarcasterUserAndLinksByUsername = async ({
  username: e,
  context: a
}) => {
  e = await getFarcasterFidByUsername(e);
  return e ? getFarcasterUserAndLinksByFid({
    fid: e,
    context: a
  }) : null;
}, getFarcasterCastByHash = async (e, a = {}, t = {}) => {
  let r;
  a.fid && ([ s, l ] = await Promise.all([ Reactions.exists({
    targetHash: e,
    fid: a.fid,
    reactionType: ReactionType.REACTION_TYPE_LIKE,
    deletedAt: null
  }), Reactions.exists({
    targetHash: e,
    fid: a.fid,
    reactionType: ReactionType.REACTION_TYPE_RECAST,
    deletedAt: null
  }) ]), r = {
    isSelfLike: s,
    isSelfRecast: l
  });
  var s = await memcache.get("getFarcasterCastByHash:" + e);
  if (s) return (l = JSON.parse(s.value)).author && (l.author = await getFarcasterUserAndLinksByFid({
    fid: l.author.fid,
    context: a
  })), {
    ...l,
    ...r
  };
  var i = await Casts.findOne({
    hash: e
  });
  if (!i || i.deletedAt) return null;
  let n;
  t.includeReply && (n = (n = await Casts.findOne({
    parentHash: i.hash,
    deletedAt: null
  })) && await getFarcasterCastByHash(n.hash, a, !1));
  var s = [ getFarcasterRepliesCount(i.hash), getFarcasterReactionsCount(i.hash, ReactionType.REACTION_TYPE_LIKE), getFarcasterReactionsCount(i.hash, ReactionType.REACTION_TYPE_RECAST), getFarcasterUserByFid(i.parentFid), getFarcasterUserAndLinksByFid({
    fid: i.fid,
    context: a
  }), getSyncedChannelByUrl(i.parentUrl), Promise.all(i.mentions.map(e => getFarcasterUserByFid(e))) ], l = JSON.parse(i.embeds), t = l.urls?.filter(e => "castId" === e.type && !a.quotedCasts?.[e.hash]).map(e => getFarcasterCastByHash(e.hash, {
    ...a,
    quotedCasts: {
      [e.hash]: !0
    }
  })) || [], [ t, s, c, d, o, g, m, u ] = (s.push(Promise.all(t)), await Promise.all(s)), h = i.text || "";
  let y = 0;
  var F, f, p, w, A, C = [];
  let S = Buffer.from(h, "utf-8");
  for (let e = 0; e < m.length; e++) m[e] && (p = i.mentionsPositions[e], F = m[e].username || "fid:" + m[e].fid, 
  F = Buffer.from("@" + F, "utf-8"), f = m[e].originalMention || "", f = Buffer.from(f, "utf-8").length, 
  p = p + y, w = S.slice(0, p), A = S.slice(p + f), S = Buffer.concat([ w, F, A ]), 
  y += F.length - f, C.push(p));
  h = S.toString("utf-8"), h = {
    hash: i.hash,
    parentHash: i.parentHash,
    parentFid: i.parentFid,
    parentUrl: i.parentUrl,
    threadHash: i.threadHash,
    text: h,
    embeds: {
      ...l,
      quoteCasts: u
    },
    mentions: m,
    mentionsPositions: C,
    external: i.external,
    author: o,
    parentAuthor: d,
    timestamp: i.timestamp.getTime(),
    replies: {
      count: t,
      reply: n
    },
    reactions: {
      count: s
    },
    recasts: {
      count: c
    },
    channel: g,
    deletedAt: i.deletedAt
  };
  return await memcache.set("getFarcasterCastByHash:" + e, JSON.stringify(h)), {
    ...h,
    ...r
  };
}, getFarcasterFeedCastByHash = async (e, a = {}) => {
  var t = await getFarcasterCastByHash(e, a);
  return t?.threadHash === e ? {
    ...t,
    childCast: null,
    childrenCasts: []
  } : t?.threadHash ? {
    ...await getFarcasterCastByHash(t.threadHash, a),
    childCast: t,
    childrenCasts: [ t ]
  } : null;
}, getFarcasterCastByShortHash = async (e, a, t = {}) => {
  a = await getFarcasterUserByUsername(a);
  if (!a) return null;
  let r;
  var s = await memcache.get("getFarcasterCastByShortHash:" + e);
  if (!(r = s ? s.value : r)) {
    s = await Casts.findOne({
      hash: {
        $regex: "^" + e
      },
      fid: a.fid,
      deletedAt: null
    });
    if (!s) return null;
    r = s.hash;
  }
  return await memcache.set("getFarcasterCastByShortHash:" + e, r), getFarcasterCastByHash(r, t);
}, getFarcasterCastsInThread = async ({
  threadHash: e,
  parentHash: a,
  limit: t,
  cursor: r,
  context: s
}) => {
  var [ i, n ] = r ? r.split("-") : [ null, null ];
  let l;
  var c = await memcache.get(`getFarcasterCastsInThread:${e}:${a}:${t}:` + r), c = (c && (l = JSON.parse(c.value).map(e => new Casts(e))), 
  {
    threadHash: e,
    deletedAt: null,
    timestamp: {
      $lt: i || Date.now()
    },
    id: {
      $lt: n || Number.MAX_SAFE_INTEGER
    }
  }), i = (a && (c.parentHash = a), l || (l = await Casts.find(c).sort({
    timestamp: -1
  }).limit(t), r && await memcache.set(`getFarcasterCastsInThread:${e}:${a}:${t}:` + r, JSON.stringify(l), {
    lifetime: 60
  })), await Promise.all(l.map(async e => {
    e = await getFarcasterCastByHash(e.hash, s, {
      includeReply: !0
    });
    return e ? {
      ...e,
      childrenCasts: e.replies?.reply ? [ e.replies.reply ] : []
    } : null;
  }))), n = await getFarcasterCastByHash(e, s);
  let d = a;
  for (var o = []; d && d !== e; ) {
    var g = await getFarcasterCastByHash(d, s);
    if (!g) break;
    o.push(g), d = g.parentHash;
  }
  let m = null;
  l.length === t && (m = l[l.length - 1].timestamp.getTime() + "-" + l[l.length - 1].id);
  const u = new Map();
  return [ n, ...o, ...i ].forEach(e => {
    e && !u.has(e.hash) && u.set(e.hash, e);
  }), [ Array.from(u.values()), m ];
}, getFarcasterCasts = async ({
  fid: e,
  parentChain: a,
  limit: t,
  cursor: r,
  context: s,
  explore: i = !1,
  filters: n = {}
}) => {
  var [ l, c ] = r ? r.split("-") : [ null, null ], l = {
    timestamp: {
      $lt: l || Date.now()
    },
    id: {
      $lt: c || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null
  };
  n?.noReplies ? l.parentHash = null : n?.repliesOnly && (l.parentHash = {
    $ne: null
  }), e && (l.fid = e), a && (l.parentUrl = a, i) && (l.globalScore = {
    $gt: GLOBAL_SCORE_THRESHOLD_CHANNEL
  });
  let d;
  (d = r && (c = await memcache.get(`getFarcasterCasts:${e}:${a}:${t}:${r}:` + i)) ? JSON.parse(c.value).map(e => new Casts(e)) : d) || (d = await Casts.find(l).sort({
    timestamp: -1
  }).limit(t), r && await memcache.set(`getFarcasterCasts:${e}:${a}:${t}:${r}:` + i, JSON.stringify(d)));
  n = d.map(e => getFarcasterCastByHash(e.hash, s)), c = (await Promise.all(n)).filter(e => e), 
  l = c.map(e => {
    return e.parentHash ? getFarcasterCastByHash(e.parentHash, s) : e;
  });
  const o = await Promise.all(l);
  let g = null;
  return [ c.map((e, a) => e.parentHash && o[a] ? {
    ...o[a],
    childCast: e,
    childrenCasts: [ e ]
  } : e), g = d.length === t ? d[d.length - 1].timestamp.getTime() + "-" + d[d.length - 1].id : g ];
}, searchFarcasterCasts = async ({}) => {
  throw new Error("searchFarcasterCasts is unavailable, index is removed - it wasn't fast.");
}, getFarcasterFollowingCount = async e => {
  var a = await memcache.get("getFarcasterFollowingCount:" + e);
  return a ? a.value : (a = await Links.find({
    fid: e,
    type: "follow",
    deletedAt: null
  }).count(), await memcache.set("getFarcasterFollowingCount:" + e, a), a);
}, getFarcasterFollowing = async (e, a, t) => {
  var [ r, s ] = t ? t.split("-") : [ null, null ];
  let i;
  (i = t && (n = await memcache.get(`getFarcasterFollowing:${e}:${a}:` + t)) ? JSON.parse(n.value).map(e => new Links(e)) : i) || (i = await Links.find({
    fid: e,
    type: "follow",
    timestamp: {
      $lt: r || Date.now()
    },
    id: {
      $lt: s || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null
  }).sort({
    timestamp: -1
  }).limit(a), t && await memcache.set(`getFarcasterFollowing:${e}:${a}:` + t, JSON.stringify(i)));
  var n = i.map(e => getFarcasterUserByFid(e.targetFid));
  let l = null;
  return [ (await Promise.all(n)).filter(e => !!e), l = i.length === a ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : l ];
}, getFarcasterFollowersCount = async e => {
  var a = await memcache.get("getFarcasterFollowersCount:" + e);
  return a ? a.value : (a = await Links.find({
    targetFid: e,
    type: "follow",
    deletedAt: null
  }).count(), await memcache.set("getFarcasterFollowersCount:" + e, a), a);
}, getFarcasterReactionsCount = async (e, a) => {
  var t = await memcache.get(`getFarcasterReactionsCount:${e}:` + a);
  return t ? t.value : (t = await Reactions.find({
    targetHash: e,
    reactionType: a,
    deletedAt: null
  }).count(), await memcache.set(`getFarcasterReactionsCount:${e}:` + a, t), t);
}, getFarcasterRepliesCount = async e => {
  var a = await memcache.get("getFarcasterRepliesCount:" + e);
  return a ? a.value : (a = await Casts.find({
    parentHash: e,
    deletedAt: null
  }).count(), await memcache.set("getFarcasterRepliesCount:" + e, a), a);
}, getFarcasterFollowers = async (e, a, t) => {
  var [ r, s ] = t ? t.split("-") : [ null, null ];
  let i;
  (i = t && (n = await memcache.get(`getFarcasterFollowers:${e}:${a}:` + t)) ? JSON.parse(n.value).map(e => new Links(e)) : i) || (i = await Links.find({
    targetFid: e,
    type: "follow",
    timestamp: {
      $lt: r || Date.now()
    },
    id: {
      $lt: s || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null
  }).sort({
    timestamp: -1
  }).limit(a), t && await memcache.set(`getFarcasterFollowers:${e}:${a}:` + t, JSON.stringify(i)));
  var n = i.map(e => getFarcasterUserByFid(e.fid));
  let l = null;
  return [ (await Promise.all(n)).filter(e => !!e), l = i.length === a ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : l ];
}, getFarcasterCastReactions = async (e, a, t) => {
  var [ r, s ] = t ? t.split("-") : [ null, null ];
  let i;
  (i = t && (n = await memcache.get(`getFarcasterCastReactions:${e}:${a}:` + t)) ? JSON.parse(n.value).map(e => new Reactions(e)) : i) || (i = await Reactions.find({
    targetHash: e,
    timestamp: {
      $lt: r || Date.now()
    },
    id: {
      $lt: s || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null
  }).sort({
    timestamp: -1
  }).limit(a), t && await memcache.set(`getFarcasterCastReactions:${e}:${a}:` + t, JSON.stringify(i)));
  var n = i.map(e => getFarcasterUserByFid(e.fid));
  let l = null;
  return [ (await Promise.all(n)).filter(e => !!e), l = i.length === a ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : l ];
}, getFarcasterCastLikes = async (e, a, t) => {
  var [ r, s ] = t ? t.split("-") : [ null, null ];
  let i;
  (i = t && (n = await memcache.get(`getFarcasterCastLikes:${e}:${a}:` + t)) ? JSON.parse(n.value).map(e => new Reactions(e)) : i) || (i = await Reactions.find({
    targetHash: e,
    reactionType: ReactionType.REACTION_TYPE_LIKE,
    id: {
      $lt: s || Number.MAX_SAFE_INTEGER
    },
    timestamp: {
      $lt: r || Date.now()
    },
    deletedAt: null
  }).sort({
    timestamp: -1
  }).limit(a), t && await memcache.set(`getFarcasterCastLikes:${e}:${a}:` + t, JSON.stringify(i)));
  var n = i.map(e => getFarcasterUserByFid(e.fid));
  let l = null;
  return [ (await Promise.all(n)).filter(e => !!e), l = i.length === a ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : l ];
}, getFarcasterCastRecasters = async (e, a, t) => {
  var [ r, s ] = t ? t.split("-") : [ null, null ];
  let i;
  (i = t && (n = await memcache.get(`getFarcasterCastRecasters:${e}:${a}:` + t)) ? JSON.parse(n.value).map(e => new Reactions(e)) : i) || (i = await Reactions.find({
    targetHash: e,
    reactionType: ReactionType.REACTION_TYPE_RECAST,
    id: {
      $lt: s || Number.MAX_SAFE_INTEGER
    },
    timestamp: {
      $lt: r || Date.now()
    },
    deletedAt: null
  }).sort({
    timestamp: -1
  }).limit(a), t && await memcache.set(`getFarcasterCastRecasters:${e}:${a}:` + t, JSON.stringify(i)));
  var n = i.map(e => getFarcasterUserByFid(e.fid));
  let l = null;
  return [ (await Promise.all(n)).filter(e => !!e), l = i.length === a ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : l ];
}, getFarcasterFeed = async ({
  limit: e = 10,
  cursor: a = null,
  context: t = {},
  explore: r = !1
}) => {
  var [ s, i ] = a ? a.split("-") : [ null, null ], s = {
    timestamp: {
      $lt: s || Date.now()
    },
    id: {
      $lt: i || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null
  };
  r && (s.globalScore = {
    $gt: GLOBAL_SCORE_THRESHOLD
  });
  let n;
  i = await memcache.get(`getFarcasterFeed:${t?.fid || "global"}:${r}:${e}:` + a), 
  (n = i ? JSON.parse(i.value).map(e => new Casts(e)) : n) || (n = await Casts.find(s).sort({
    timestamp: -1
  }).limit(e), a ? await memcache.set(`getFarcasterFeed:${t?.fid || "global"}:${r}:${e}:` + a, JSON.stringify(n)) : await memcache.set(`getFarcasterFeed:${t?.fid || "global"}:${r}:${e}:` + a, JSON.stringify(n), {
    lifetime: 60
  })), i = n.map(e => getFarcasterFeedCastByHash(e.hash, t)), s = (await Promise.all(i)).filter(e => !(!e || e.parentHash && e.threadHash === e.hash));
  const l = {};
  r = s.reduce((e, a) => (a.author?.fid && (e[a.hash] || l[a.author.fid] ? l[a.author.fid] || a.childrenCasts.length > e[a.hash].childrenCasts.length && (e[a.hash] = a, 
  l[a.author.fid] = l[a.author.fid] ? l[a.author.fid] + 1 : 1) : (e[a.hash] = a, 
  l[a.author.fid] = l[a.author.fid] ? l[a.author.fid] + 1 : 1)), e), {});
  let c = null;
  return n.length >= e && (c = n[n.length - 1].timestamp.getTime() + "-" + n[n.length - 1].id), 
  [ Object.values(r), c ];
}, getFarcasterUnseenNotificationsCount = async ({
  lastSeen: e,
  context: a
}) => {
  var t;
  return a.fid ? (t = await memcache.get("getFarcasterUnseenNotificationsCount:" + a.fid)) ? t.value : (t = await Notifications.find({
    toFid: a.fid,
    timestamp: {
      $gt: e
    },
    deletedAt: null
  }).count(), await memcache.set("getFarcasterUnseenNotificationsCount:" + a.fid, t), 
  t) : 0;
}, getFarcasterNotifications = async ({
  limit: e,
  cursor: a,
  context: s
}) => {
  var t, [ r, i ] = a ? a.split("-") : [ null, null ];
  let n, l = ((n = a && (t = await memcache.get(`getFarcasterNotifications:${s.fid}:${e}:` + a)) ? JSON.parse(t.value).map(e => new Notifications(e)) : n) || (n = await Notifications.find({
    toFid: s.fid,
    timestamp: {
      $lt: r || Date.now()
    },
    fromFid: {
      $ne: s.fid
    },
    id: {
      $lt: i || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null
  }).sort({
    timestamp: -1
  }).limit(e), a && await memcache.set(`getFarcasterNotifications:${s.fid}:${e}:` + a, JSON.stringify(n))), 
  null);
  return n.length === e && (l = n[n.length - 1].timestamp.getTime() + "-" + n[n.length - 1].id), 
  [ await Promise.all(n.map(async e => {
    var [ a, t ] = await Promise.all([ getFarcasterUserAndLinksByFid({
      fid: e.fromFid,
      context: s
    }), [ "reply", "mention", "reaction" ].includes(e.notificationType) ? getFarcasterCastByHash(e.payload.castHash, s) : null ]), r = {}, t = (t && (r.cast = t), 
    {
      type: e.notificationType,
      timestamp: e.timestamp.getTime(),
      actor: a,
      content: r,
      id: e.id
    });
    return "reaction" === e.notificationType && (t.reactionType = e.payload.reactionType), 
    t;
  })), l ];
}, getFarcasterStorageByFid = async e => {
  let a;
  var t = await memcache.get("getFarcasterStorageByFid:" + e);
  return (a = t ? JSON.parse(t.value).map(e => new Storage(e)) : a) || (a = await Storage.find({
    fid: e,
    deletedAt: null
  }), await memcache.set("getFarcasterStorageByFid:" + e, JSON.stringify(a))), a.forEach(e => {
    e.timestamp < new Date("2024-08-28T00:00:00Z") && (e.expiry = new Date(e.expiry.getTime() + 31536e6));
  }), a.map(e => ({
    timestamp: e.timestamp,
    fid: e.fid,
    units: e.units,
    expiry: e.expiry
  }));
}, getFarcasterSignersForFid = async e => {
  let a;
  var t = await memcache.get("getFarcasterSignersForFid:" + e);
  return (a = t ? JSON.parse(t.value).map(e => new Signers(e)) : a) || (a = await Signers.find({
    fid: e,
    deletedAt: null
  }), await memcache.set("getFarcasterSignersForFid:" + e, JSON.stringify(a))), 
  a.map(e => e.toJSON());
}, getLeaderboard = async ({
  scoreType: e,
  limit: a
}) => {
  e = await Score.getLeaderboard(e, a);
  return (await Promise.all(e.map(async e => {
    var a = e.address.toLowerCase(), [ a, t ] = await Promise.all([ getFarcasterUserByCustodyAddress(a), getFarcasterUserByFid(a) ]), a = a || t;
    return {
      ...e,
      profile: a
    };
  }))).filter(e => e.profile);
}, makeSignatureParams = ({
  publicKey: e,
  deadline: a
}) => {
  return e && a ? {
    primaryType: "SignedKeyRequest",
    domain: {
      name: "Farcaster SignedKeyRequestValidator",
      version: "1",
      chainId: 10,
      verifyingContract: "0x00000000fc700472606ed4fa22623acf62c60553"
    },
    types: {
      SignedKeyRequest: [ {
        name: "requestFid",
        type: "uint256"
      }, {
        name: "key",
        type: "bytes"
      }, {
        name: "deadline",
        type: "uint256"
      } ]
    },
    message: {
      requestFid: ethers.BigNumber.from(config().FARCAST_FID),
      key: "0x" + e,
      deadline: ethers.BigNumber.from(a)
    }
  } : {};
}, getFidMetadataSignature = async ({
  publicKey: e,
  deadline: a
}) => {
  e = makeSignatureParams({
    publicKey: e,
    deadline: a
  });
  if (e.message) return (async e => {
    var a = config().FARCAST_KEY || config().MOCK_SIGNER_KEY;
    if (a) return a = ethers.Wallet.fromMnemonic(a), e = {
      domain: e.domain,
      types: e.types,
      message: e.message,
      primaryType: e.primaryType
    }, a._signTypedData(e.domain, e.types, e.message);
    throw new Error("Not configured!");
  })(e);
  throw new Error("Invalid signature params");
}, getFrame = async e => {
  return await Frames.findOne({
    hash: e
  });
}, getFrames = async ({
  limit: e,
  cursor: a
}) => {
  var [ t, r ] = a ? a.split("-") : [ null, null ], t = {
    createdAt: {
      $lt: t || Date.now()
    },
    id: {
      $lt: r || Number.MAX_SAFE_INTEGER
    }
  };
  let s, i = ((s = a && (r = await memcache.get(`getFrames:${e}:` + a)) ? JSON.parse(r.value).map(e => new Frames(e)) : s) || (s = await Frames.find(t).sort({
    createdAt: -1
  }).limit(e), a && await memcache.set(`getFrames:${e}:` + a, JSON.stringify(s))), 
  null);
  return s.length === e && (i = s[s.length - 1].createdAt.getTime() + "-" + s[s.length - 1].id), 
  [ s, i ];
}, createReport = async (e, a) => {
  var t, r;
  if (e) return t = (r = await Reports.findOne({
    fid: e
  }))?.count || 0, (r = new Set(r?.reporters || [])).add(a), t += 1, a = await Reports.findOneAndUpdate({
    fid: e
  }, {
    count: t,
    reporters: Array.from(r)
  }, {
    upsert: !0
  }), await memcache.set("algorithm_getReport:" + e, JSON.stringify(a)), a;
}, getActions = async ({
  limit: e,
  cursor: a
}) => {
  var [ t, r ] = a ? a.split("-") : [ null, null ], t = {
    createdAt: {
      $lt: t || Date.now()
    },
    id: {
      $lt: r || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null,
    rank: {
      $gt: -1
    }
  };
  let s, i = ((s = a && (r = await memcache.get(`getActions:${e}:` + a)) ? JSON.parse(r.value).map(e => new SyncedActions(e)) : s) || (s = await SyncedActions.find(t).sort("rank _id").limit(e), 
  a && await memcache.set(`getActions:${e}:` + a, JSON.stringify(s))), null);
  return s.length === e && (i = s[s.length - 1].createdAt.getTime() + "-" + s[s.length - 1].id), 
  [ s, i ];
}, createAction = async ({
  ...e
}) => {
  e = {
    name: e.name,
    icon: e.icon,
    description: e.description,
    aboutUrl: e.aboutUrl,
    actionUrl: e.actionUrl,
    action: {
      actionType: e.actionType,
      postUrl: e.actionPostUrl
    }
  };
  try {
    return await SyncedActions.findOneAndUpdate({
      actionUrl: e.actionUrl
    }, {
      $set: e
    }, {
      upsert: !0
    });
  } catch (e) {
    throw console.error("Failed to create or update action:", e), e;
  }
}, getFarPay = async e => {
  var a = "farPay:" + e;
  let t = await memcache.get(a);
  return t ? t = JSON.parse(t.value) : (t = await FarPay.findOne({
    uniqueId: e
  })) && await memcache.set(a, JSON.stringify(t)), t;
}, crypto = require("crypto"), updateFarPay = async ({
  uniqueId: e,
  ...a
}) => {
  if (!e) throw new Error("Missing required uniqueId");
  a = await FarPay.findOneAndUpdate({
    uniqueId: e
  }, {
    $set: {
      txHash: a.txHash
    }
  }, {
    new: !0
  });
  if (a) return await memcache.delete("farPay:" + e), a;
  throw new Error("FarPay not found");
}, createFarPay = async ({
  ...e
}) => {
  var a;
  if (e.txId) return a = crypto.randomBytes(16).toString("hex"), await (a = new FarPay({
    uniqueId: a,
    txId: e.txId,
    data: JSON.stringify(e.data),
    callbackUrl: e.callbackUrl
  })).save(), a;
  throw new Error("Missing required fields");
}, getFarpayDeeplink = async ({
  txId: e,
  data: a,
  callbackUrl: t
}) => {
  var r = await createFarPay({
    txId: e,
    data: a,
    callbackUrl: t
  });
  return {
    deepLinkUrl: `farquest://?txId=${e}&data=${encodeURIComponent(JSON.stringify(a))}&uniqueId=${r.uniqueId}&callbackUrl=` + encodeURIComponent(t),
    uniqueId: r.uniqueId
  };
}, searchCastHandleByMatch = async (e, a = 10, t = "text") => {
  if (!e) return [];
  var r = escapeRegExp(e.toLowerCase()), s = "searchCastHandleByMatch:" + e, i = await memcache.get(getHash(s));
  if (i) return JSON.parse(i.value);
  let n;
  if ("development" === process.env.NODE_ENV) n = await CastHandle.find({
    handle: {
      $regex: "^" + r,
      $options: "i"
    }
  }).read("secondaryPreferred").limit(a).sort(t); else try {
    n = await CastHandle.aggregate().search({
      text: {
        query: e,
        path: "handle",
        fuzzy: {
          maxEdits: 2,
          prefixLength: 0,
          maxExpansions: 50
        }
      },
      index: "search-casthandles"
    }).limit(a);
  } catch (e) {
    return console.error("Error searching casthandles", e), Sentry.captureException(e), 
    [];
  }
  i = n.map(e => ({
    handle: e.handle,
    owner: e.owner,
    tokenId: e.tokenId
  }));
  return await memcache.set(getHash(s), JSON.stringify(i), {
    lifetime: 300
  }), i;
};

module.exports = {
  getFarcasterUserByFid: getFarcasterUserByFid,
  getFarcasterUserByUsername: getFarcasterUserByUsername,
  getFarcasterCastByHash: getFarcasterCastByHash,
  getFarcasterCastsInThread: getFarcasterCastsInThread,
  getFarcasterCasts: getFarcasterCasts,
  getFarcasterFollowing: getFarcasterFollowing,
  getFarcasterFollowers: getFarcasterFollowers,
  getFarcasterCastReactions: getFarcasterCastReactions,
  getFarcasterCastLikes: getFarcasterCastLikes,
  getFarcasterCastRecasters: getFarcasterCastRecasters,
  getFarcasterCastByShortHash: getFarcasterCastByShortHash,
  getFarcasterFeed: getFarcasterFeed,
  getFidByCustodyAddress: getFidByCustodyAddress,
  getCustodyAddressByFid: getCustodyAddressByFid,
  getFarcasterUserByCustodyAddress: getFarcasterUserByCustodyAddress,
  getFarcasterNotifications: getFarcasterNotifications,
  getFarcasterUnseenNotificationsCount: getFarcasterUnseenNotificationsCount,
  getFarcasterUserAndLinksByFid: getFarcasterUserAndLinksByFid,
  getFarcasterUserAndLinksByUsername: getFarcasterUserAndLinksByUsername,
  getFarcasterUserByConnectedAddress: getFarcasterUserByConnectedAddress,
  getConnectedAddressForFid: getConnectedAddressForFid,
  postMessage: postMessage,
  searchFarcasterUserByMatch: searchFarcasterUserByMatch,
  GLOBAL_SCORE_THRESHOLD: GLOBAL_SCORE_THRESHOLD,
  GLOBAL_SCORE_THRESHOLD_CHANNEL: GLOBAL_SCORE_THRESHOLD_CHANNEL,
  getFarcasterFidByCustodyAddress: getFarcasterFidByCustodyAddress,
  getFarcasterUserByAddress: getFarcasterUserByAddress,
  getFarcasterStorageByFid: getFarcasterStorageByFid,
  getLeaderboard: getLeaderboard,
  getFidMetadataSignature: getFidMetadataSignature,
  getFrame: getFrame,
  getFrames: getFrames,
  createReport: createReport,
  getSyncedChannelById: getSyncedChannelById,
  getSyncedChannelByUrl: getSyncedChannelByUrl,
  searchChannels: searchChannels,
  searchFarcasterCasts: searchFarcasterCasts,
  isFollowingChannel: isFollowingChannel,
  getActions: getActions,
  createAction: createAction,
  getFarcasterSignersForFid: getFarcasterSignersForFid,
  getFarcasterReactionsCount: getFarcasterReactionsCount,
  getFarcasterFollowersCount: getFarcasterFollowersCount,
  getFarcasterRepliesCount: getFarcasterRepliesCount,
  getFarPay: getFarPay,
  getFarpayDeeplink: getFarpayDeeplink,
  updateFarPay: updateFarPay,
  searchCastHandleByMatch: searchCastHandleByMatch
};
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
  FarPay,
  FrameNotification
} = require("../models/farcaster"), CastHandle = require("../models/CastHandle")["CastHandle"], mongoose = require("mongoose"), Score = require("../models/Score")["Score"], _AlchemyService = require("../services/AlchemyService")["Service"], {
  config,
  prod
} = require("../helpers/registrar"), getHexTokenIdFromLabel = require("../helpers/get-token-id-from-label")["getHexTokenIdFromLabel"], ethers = require("ethers")["ethers"], {
  memcache,
  getHash
} = require("../connectmemcache"), {
  Message,
  fromFarcasterTime
} = require("@farcaster/hub-nodejs"), bs58 = require("bs58"), axios = require("axios"), Sentry = require("@sentry/node"), crypto = require("crypto");

async function isFollowingChannel(e, t) {
  let a = "";
  do {
    var r = await axios.get(`https://client.warpcast.com/v2/user-following-channels?fid=${e}&limit=50&cursor=` + a, {
      headers: {
        Authorization: "Bearer " + process.env.FARQUEST_FARCASTER_APP_TOKEN
      }
    });
    if (r.data.result.channels.find(e => e.key === t)) return !0;
    a = r.data.next?.cursor;
  } while (a);
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
  var t, a;
  return e ? (t = "syncedChannel:" + e, (a = await memcache.get(t)) ? JSON.parse(a.value) : ((a = await SyncedChannels.findOne({
    channelId: e
  })) && await memcache.set(t, JSON.stringify(a), {
    lifetime: 21600
  }), a)) : null;
}, getSyncedChannelByUrl = async e => {
  var t, a;
  return e ? (t = "syncedChannel:" + e, (a = await memcache.get(t)) ? JSON.parse(a.value) : ((a = await SyncedChannels.findOne({
    url: e
  })) && await memcache.set(t, JSON.stringify(a), {
    lifetime: 21600
  }), a)) : null;
}, searchChannels = async e => {
  var t, a;
  return e ? (t = getHash("searchChannels:" + e), (a = await memcache.get(t)) ? JSON.parse(a.value) : (0 < (a = await SyncedChannels.aggregate([ {
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
  } ])).length && await memcache.set(t, JSON.stringify(a), {
    lifetime: 21600
  }), a)) : [];
}, postMessage = async ({
  isExternal: a = !1,
  externalFid: r,
  messageJSON: s,
  hubClient: i,
  errorHandler: t = e => console.error(e),
  bodyOverrides: n
}) => {
  try {
    let e = a, t = Message.fromJSON(s);
    var d, l;
    if (!e && [ MessageType.MESSAGE_TYPE_CAST_ADD, MessageType.MESSAGE_TYPE_CAST_REMOVE ].includes(t.type) && (t.data.type == MessageType.MESSAGE_TYPE_CAST_ADD && t.data.castAddBody.parentCastId ? (d = await Casts.findOne({
      hash: bytesToHex(t.data.castAddBody.parentCastId.hash)
    }), e = d?.external || e) : t.data.type == MessageType.MESSAGE_TYPE_CAST_REMOVE && (l = await Casts.findOne({
      hash: bytesToHex(t.data.castRemoveBody.targetHash)
    }), e = l?.external || e)), e && t.data.type === MessageType.MESSAGE_TYPE_USER_DATA_ADD && t.data.userDataBody.type === UserDataType.USER_DATA_TYPE_USERNAME) {
      let e = Buffer.from(t.data.userDataBody.value).toString("ascii").replace(".beb", "").replace(".cast", "");
      e.includes(".op") ? e = "op_" + e.replace(".op", "") : e.includes(".base") && (e = "base_" + e.replace(".base", ""));
      var c = getHexTokenIdFromLabel(e);
      if (!await CastHandle.exists({
        owner: r?.toLowerCase(),
        tokenId: c.toLowerCase()
      })) {
        var o = `Invalid UserData for external user, could not find ${e}/${c} in CastHandles!`;
        if ("production" === process.env.NODE_ENV) throw new Error(o);
        console.error(o);
      }
    }
    if (!e) {
      var g = await i.submitMessage(t), u = g.unwrapOr(null);
      if (!u) throw new Error("Could not send message: " + g?.error);
      t = {
        ...u,
        hash: u.hash,
        signer: u.signer
      };
    }
    var m = new Date(), h = {
      fid: e ? r : t.data.fid,
      createdAt: m,
      updatedAt: m,
      messageType: t.data.type,
      timestamp: farcasterTimeToDate(t.data.timestamp),
      hash: bytesToHex(t.hash),
      hashScheme: t.hashScheme,
      signature: bytesToHex(t.signature),
      signatureScheme: t.signatureScheme,
      signer: bytesToHex(t.signer),
      raw: bytesToHex(Message.encode(t).finish()),
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
    throw t(e), e;
  }
}, GLOBAL_SCORE_THRESHOLD = 50, GLOBAL_SCORE_THRESHOLD_CHANNEL = 5, getFarcasterUserByFid = async e => {
  var t = await memcache.get("getFarcasterUserByFid:" + e);
  if (t) return JSON.parse(t.value);
  if (!e) return null;
  var [ t, a, r, s, i, n, d ] = await Promise.all([ getFarcasterFollowingCount(e), getFarcasterFollowersCount(e), UserData.find({
    fid: e,
    deletedAt: null
  }).sort({
    createdAt: 1
  }), Fnames.findOne({
    fid: e,
    deletedAt: null
  }), Fids.findOne({
    fid: e,
    deletedAt: null
  }), getConnectedAddressForFid(e), getConnectedAddressesForFid(e) ]), l = e.toString().startsWith("0x") || !1;
  if (!i && !l) return null;
  if (i?.nerfed) return null;
  var c = {
    fid: e.toString().toLowerCase(),
    followingCount: t,
    followerCount: a,
    pfp: {
      url: "",
      verified: !1
    },
    bio: {
      text: "",
      mentions: []
    },
    external: l,
    custodyAddress: i?.custodyAddress,
    connectedAddress: n,
    allConnectedAddresses: d,
    username: s?.fname
  };
  let o = i?.timestamp;
  var g = {};
  for (const F of r) {
    o = o || F.createdAt, F.createdAt < o && (o = F.createdAt);
    var u = F.value.startsWith("0x") ? F.value.slice(2) : F.value, m = Buffer.from(u, "hex").toString("utf8");
    switch (F.type) {
     case UserDataType.USER_DATA_TYPE_USERNAME:
      c.username && !m.includes(".eth") || g.username || (c.username = m, g.username = !0);
      break;

     case UserDataType.USER_DATA_TYPE_DISPLAY:
      g.displayName || (c.displayName = m, g.displayName = !0);
      break;

     case UserDataType.USER_DATA_TYPE_PFP:
      g.pfp || (c.pfp.url = m, g.pfp = !0);
      break;

     case UserDataType.USER_DATA_TYPE_BIO:
      if (!g.bio) {
        c.bio.text = m;
        for (var h, y = /(?<!\]\()@([a-zA-Z0-9_]+(\.[a-z]{2,})*)/g; h = y.exec(m); ) c.bio.mentions.push(h[1]);
        g.bio = !0;
      }
      break;

     case UserDataType.USER_DATA_TYPE_URL:
      g.url || (c.url = m, g.url = !0);
    }
  }
  return c.registeredAt = o?.getTime(), await memcache.set("getFarcasterUserByFid:" + e, JSON.stringify(c)), 
  c;
}, getFarcasterUserAndLinksByFid = async ({
  fid: e,
  context: t
}) => {
  var a = await getFarcasterUserByFid(e);
  if (!t.fid || e === t.fid) return a;
  if (!a) return null;
  let r;
  var s, i = await memcache.get(`getFarcasterUserAndLinksByFid_${t.fid}:` + e);
  return (r = i ? JSON.parse(i.value) : r) || ([ i, s ] = await Promise.all([ Links.exists({
    fid: t.fid,
    targetFid: e,
    type: "follow",
    deletedAt: null
  }), Links.exists({
    fid: e,
    targetFid: t.fid,
    type: "follow",
    deletedAt: null
  }) ]), r = {
    isFollowing: i,
    isFollowedBy: s
  }, await memcache.set(`getFarcasterUserAndLinksByFid_${t.fid}:` + e, JSON.stringify(r))), 
  {
    ...a,
    ...r
  };
}, getFarcasterUserByCustodyAddress = async e => {
  return (e = e && await Fids.findOne({
    custodyAddress: e,
    deletedAt: null
  })) ? getFarcasterUserByFid(e.fid) : null;
}, getFarcasterFidByCustodyAddress = async e => {
  var t;
  return e ? (t = await memcache.get("getFarcasterFidByCustodyAddress:" + e)) ? "" === t.value ? null : t.value : (t = (await Fids.findOne({
    custodyAddress: e,
    deletedAt: null
  }))?.fid || null, await memcache.set("getFarcasterFidByCustodyAddress:" + e, t || ""), 
  t) : null;
}, getFarcasterL1UserByAnyAddress = async e => {
  var [ e, t ] = await Promise.all([ getFarcasterUserByCustodyAddress(e), getFarcasterUserByConnectedAddress(e) ]);
  return t || e;
}, getFarcasterUserByAddress = async e => {
  var [ e, t ] = await Promise.all([ getFarcasterUserByCustodyAddress(e), getFarcasterUserByFid(e) ]);
  return e || t;
}, getFarcasterUserByAnyAddress = async e => {
  var t, a;
  return e ? ([ e, t, a ] = await Promise.all([ getFarcasterUserByCustodyAddress(e), getFarcasterUserByConnectedAddress(e), getFarcasterUserByFid(e) ]), 
  t || e || a) : null;
}, getFarcasterUserByConnectedAddress = async t => {
  let a = null;
  var r = await memcache.get("getFarcasterUserByConnectedAddress_fid:" + t);
  if (!(a = r ? r.value : a)) {
    r = "0x" === t.slice(0, 2);
    let e = t.toLowerCase();
    if (!r) try {
      e = "0x" + Buffer.from(bs58.decode(t)).toString("hex");
    } catch (e) {
      console.error("Error decoding solana address, fallback to hex", e);
    }
    r = await Verifications.findOne({
      "claimObj.address": e,
      deletedAt: null
    });
    a = r ? r.fid : "0";
  }
  return await memcache.set("getFarcasterUserByConnectedAddress_fid:" + t, a), "0" !== a ? getFarcasterUserByFid(a) : null;
}, getConnectedAddressForFid = async e => {
  var t;
  return e ? (t = await memcache.get("getConnectedAddressForFid:" + e)) ? t.value : (t = await Verifications.findOne({
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
  })) && (t = t.claimObj || JSON.parse(t.claim)) ? (await memcache.set("getConnectedAddressForFid:" + e, t.address.toLowerCase()), 
  t.address) : null : null;
}, getConnectedAddressesForFid = async e => {
  if (!e) return {
    ethereum: [],
    solana: []
  };
  var t = await memcache.get("getConnectedAddressesForFid:" + e);
  if (t) return JSON.parse(t.value);
  t = (await Verifications.find({
    fid: e,
    deletedAt: null
  })).map(t => {
    t = t.claimObj || JSON.parse(t.claim);
    if (1 === t.protocol) try {
      return [ "solana", bs58.encode(Buffer.from(t.address.slice(2), "hex")).toString() ];
    } catch (e) {
      return console.error("Error encoding solana address, fallback to hex", e), 
      [ "solana", t.address.toLowerCase() ];
    }
    return ethers.utils.isAddress(t.address) ? [ "ethereum", t.address.toLowerCase() ] : null;
  });
  const a = {
    ethereum: new Set(),
    solana: new Set()
  };
  return t.forEach(e => {
    e && a[e[0]].add(e[1]);
  }), Object.keys(a).forEach(e => {
    a[e] = Array.from(a[e]);
  }), await memcache.set("getConnectedAddressesForFid:" + e, JSON.stringify(a)), 
  a;
}, getCustodyAddressByFid = async e => {
  var t;
  return e ? (t = await memcache.get("getCustodyAddressByFid:" + e)) ? t.value : (t = await Fids.findOne({
    fid: e,
    deletedAt: null
  })) ? (await memcache.set("getCustodyAddressByFid:" + e, t.custodyAddress), t.custodyAddress) : null : null;
}, getFidByCustodyAddress = async e => {
  var t;
  return e ? (t = await memcache.get("getFidByCustodyAddress:" + e)) ? t.value : (t = await Fids.findOne({
    custodyAddress: e,
    deletedAt: null
  })) ? (await memcache.set("getFidByCustodyAddress:" + e, t.fid), t.fid) : null : null;
}, searchFarcasterUserByMatch = async (t, e = 10, a = "text", r = !0) => {
  if (!t) return [];
  var s = escapeRegExp(t.toLowerCase());
  let i = "searchFarcasterUserByMatch:" + t;
  r || (i += ":noExternal");
  var n = await memcache.get(getHash(i));
  if (n) return JSON.parse(n.value);
  var [ n, s, a ] = await Promise.all([ (async () => {
    var e = await UserData.findOne({
      fid: t,
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
  }).read("secondaryPreferred").limit(2 < e ? Math.ceil(e / 2) : 1).sort(a) : (async () => {
    try {
      return await UserData.aggregate().search({
        text: {
          query: t,
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
  }).read("secondaryPreferred").limit(2 < e ? Math.ceil(e / 2) : 1).sort(a) : [] ]), n = [ ...n, ...s, ...a ];
  const d = {};
  s = n.map(e => d[e.fid] ? null : (d[e.fid] = !0, e.fid)).filter(e => null !== e), 
  a = await Promise.all(s.map(e => getFarcasterUserByFid(e)));
  return await memcache.set(getHash(i), JSON.stringify(a), {
    lifetime: 300
  }), a;
}, getFarcasterFidByUsername = async e => {
  let t;
  var a = await memcache.get("getFarcasterFidByUsername:" + e);
  return (t = a ? a.value : t) || (a = await Fnames.findOne({
    fname: e,
    deletedAt: null
  })) && (t = a.fid || await getFidByCustodyAddress(a.custodyAddress)), t || (a = "0x" + Buffer.from(e, "ascii").toString("hex"), 
  a = await UserData.findOne({
    value: a,
    type: UserDataType.USER_DATA_TYPE_USERNAME,
    deletedAt: null
  }).sort({
    createdAt: -1
  }), t = a?.fid), t ? (await memcache.set("getFarcasterFidByUsername:" + e, t), 
  t) : null;
}, getFarcasterUserByUsername = async (e, t = 0) => {
  e = await getFarcasterFidByUsername(e);
  return e ? getFarcasterUserByFid(e) : null;
}, getFarcasterUserAndLinksByUsername = async ({
  username: e,
  context: t
}) => {
  e = await getFarcasterFidByUsername(e);
  return e ? getFarcasterUserAndLinksByFid({
    fid: e,
    context: t
  }) : null;
}, getFarcasterCastByHash = async (e, t = {}, a = {}) => {
  let r;
  t.fid && ([ s, d ] = await Promise.all([ Reactions.exists({
    targetHash: e,
    fid: t.fid,
    reactionType: ReactionType.REACTION_TYPE_LIKE,
    deletedAt: null
  }), Reactions.exists({
    targetHash: e,
    fid: t.fid,
    reactionType: ReactionType.REACTION_TYPE_RECAST,
    deletedAt: null
  }) ]), r = {
    isSelfLike: s,
    isSelfRecast: d
  });
  var s = await memcache.get("getFarcasterCastByHash:" + e);
  if (s) return (d = JSON.parse(s.value)).author && (d.author = await getFarcasterUserAndLinksByFid({
    fid: d.author.fid,
    context: t
  })), {
    ...d,
    ...r
  };
  var i = await Casts.findOne({
    hash: e
  });
  if (!i || i.deletedAt) return null;
  let n;
  a.includeReply && (n = (n = await Casts.findOne({
    parentHash: i.hash,
    deletedAt: null
  })) && await getFarcasterCastByHash(n.hash, t, !1));
  var s = [ getFarcasterRepliesCount(i.hash), getFarcasterReactionsCount(i.hash, ReactionType.REACTION_TYPE_LIKE), getFarcasterReactionsCount(i.hash, ReactionType.REACTION_TYPE_RECAST), getFarcasterUserByFid(i.parentFid), getFarcasterUserAndLinksByFid({
    fid: i.fid,
    context: t
  }), getSyncedChannelByUrl(i.parentUrl), Promise.all(i.mentions.map(e => getFarcasterUserByFid(e))) ], d = JSON.parse(i.embeds), a = d.urls?.filter(e => "castId" === e.type && !t.quotedCasts?.[e.hash]).map(e => getFarcasterCastByHash(e.hash, {
    ...t,
    quotedCasts: {
      [e.hash]: !0
    }
  })) || [], [ a, s, l, c, o, g, u, m ] = (s.push(Promise.all(a)), await Promise.all(s)), h = i.text || "";
  let y = 0;
  var F, f, p, w, A, C = [];
  let S = Buffer.from(h, "utf-8");
  for (let e = 0; e < u.length; e++) u[e] && (p = i.mentionsPositions[e], F = u[e].username || "fid:" + u[e].fid, 
  F = Buffer.from("@" + F, "utf-8"), f = u[e].originalMention || "", f = Buffer.from(f, "utf-8").length, 
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
      ...d,
      quoteCasts: m
    },
    mentions: u,
    mentionsPositions: C,
    external: i.external,
    author: o,
    parentAuthor: c,
    timestamp: i.timestamp.getTime(),
    replies: {
      count: a,
      reply: n
    },
    reactions: {
      count: s
    },
    recasts: {
      count: l
    },
    channel: g,
    deletedAt: i.deletedAt
  };
  return await memcache.set("getFarcasterCastByHash:" + e, JSON.stringify(h)), {
    ...h,
    ...r
  };
}, getFarcasterFeedCastByHash = async (e, t = {}) => {
  var a = await getFarcasterCastByHash(e, t);
  return a?.threadHash === e ? {
    ...a,
    childCast: null,
    childrenCasts: []
  } : a?.threadHash ? {
    ...await getFarcasterCastByHash(a.threadHash, t),
    childCast: a,
    childrenCasts: [ a ]
  } : null;
}, getFarcasterCastByShortHash = async (e, t, a = {}) => {
  t = await getFarcasterUserByUsername(t);
  if (!t) return null;
  let r;
  var s = await memcache.get("getFarcasterCastByShortHash:" + e);
  if (!(r = s ? s.value : r)) {
    s = await Casts.findOne({
      hash: {
        $regex: "^" + e
      },
      fid: t.fid,
      deletedAt: null
    });
    if (!s) return null;
    r = s.hash;
  }
  return await memcache.set("getFarcasterCastByShortHash:" + e, r), getFarcasterCastByHash(r, a);
}, getFarcasterCastsInThread = async ({
  threadHash: e,
  parentHash: t,
  limit: a,
  cursor: r,
  context: s
}) => {
  var [ i, n ] = r ? r.split("-") : [ null, null ];
  let d;
  var l = await memcache.get(`getFarcasterCastsInThread:${e}:${t}:${a}:` + r), l = (l && (d = JSON.parse(l.value).map(e => new Casts(e))), 
  {
    threadHash: e,
    deletedAt: null,
    timestamp: {
      $lt: i || Date.now()
    },
    id: {
      $lt: n || Number.MAX_SAFE_INTEGER
    }
  }), i = (t && (l.parentHash = t), d || (d = await Casts.find(l).sort({
    timestamp: -1
  }).limit(a), r && await memcache.set(`getFarcasterCastsInThread:${e}:${t}:${a}:` + r, JSON.stringify(d), {
    lifetime: 60
  })), await Promise.all(d.map(async e => {
    e = await getFarcasterCastByHash(e.hash, s, {
      includeReply: !0
    });
    return e ? {
      ...e,
      childrenCasts: e.replies?.reply ? [ e.replies.reply ] : []
    } : null;
  }))), n = await getFarcasterCastByHash(e, s);
  let c = t;
  for (var o = []; c && c !== e; ) {
    var g = await getFarcasterCastByHash(c, s);
    if (!g) break;
    o.push(g), c = g.parentHash;
  }
  let u = null;
  d.length === a && (u = d[d.length - 1].timestamp.getTime() + "-" + d[d.length - 1].id);
  const m = new Map();
  return [ n, ...o, ...i ].forEach(e => {
    e && !m.has(e.hash) && m.set(e.hash, e);
  }), [ Array.from(m.values()), u ];
}, getFarcasterCasts = async ({
  fid: e,
  parentChain: t,
  limit: a,
  cursor: r,
  context: s,
  explore: i = !1,
  filters: n = {}
}) => {
  var [ d, l ] = r ? r.split("-") : [ null, null ], d = {
    timestamp: {
      $lt: d || Date.now()
    },
    id: {
      $lt: l || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null
  };
  n?.noReplies ? d.parentHash = null : n?.repliesOnly && (d.parentHash = {
    $ne: null
  }), e && (d.fid = e), t && (d.parentUrl = t, i) && (d.globalScore = {
    $gt: GLOBAL_SCORE_THRESHOLD_CHANNEL
  });
  let c;
  (c = r && (l = await memcache.get(`getFarcasterCasts:${e}:${t}:${a}:${r}:` + i)) ? JSON.parse(l.value).map(e => new Casts(e)) : c) || (c = await Casts.find(d).sort({
    timestamp: -1
  }).limit(a), r && await memcache.set(`getFarcasterCasts:${e}:${t}:${a}:${r}:` + i, JSON.stringify(c)));
  n = c.map(e => getFarcasterCastByHash(e.hash, s)), l = (await Promise.all(n)).filter(e => e), 
  d = l.map(e => {
    return e.parentHash ? getFarcasterCastByHash(e.parentHash, s) : e;
  });
  const o = await Promise.all(d);
  let g = null;
  return [ l.map((e, t) => e.parentHash && o[t] ? {
    ...o[t],
    childCast: e,
    childrenCasts: [ e ]
  } : e), g = c.length === a ? c[c.length - 1].timestamp.getTime() + "-" + c[c.length - 1].id : g ];
}, searchFarcasterCasts = async ({}) => {
  throw new Error("searchFarcasterCasts is unavailable, index is removed - it wasn't fast.");
}, getFarcasterFollowingCount = async e => {
  var t = await memcache.get("getFarcasterFollowingCount:" + e);
  return t ? t.value : (t = await Links.countDocuments({
    fid: e,
    type: "follow",
    deletedAt: null
  }), await memcache.set("getFarcasterFollowingCount:" + e, t), t);
}, getFarcasterFollowing = async (e, t, a) => {
  var [ r, s ] = a ? a.split("-") : [ null, null ];
  let i;
  (i = a && (n = await memcache.get(`getFarcasterFollowing:${e}:${t}:` + a)) ? JSON.parse(n.value).map(e => new Links(e)) : i) || (i = await Links.find({
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
  }).limit(t), a && await memcache.set(`getFarcasterFollowing:${e}:${t}:` + a, JSON.stringify(i)));
  var n = i.map(e => getFarcasterUserByFid(e.targetFid));
  let d = null;
  return [ (await Promise.all(n)).filter(e => !!e), d = i.length === t ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : d ];
}, getFarcasterFollowersCount = async e => {
  var t = await memcache.get("getFarcasterFollowersCount:" + e);
  return t ? t.value : (t = await Links.countDocuments({
    targetFid: e,
    type: "follow",
    deletedAt: null
  }), await memcache.set("getFarcasterFollowersCount:" + e, t), t);
}, getFarcasterReactionsCount = async (e, t) => {
  var a = await memcache.get(`getFarcasterReactionsCount:${e}:` + t);
  return a ? a.value : (a = await Reactions.countDocuments({
    targetHash: e,
    reactionType: t,
    deletedAt: null
  }), await memcache.set(`getFarcasterReactionsCount:${e}:` + t, a), a);
}, getFarcasterRepliesCount = async e => {
  var t;
  return e ? (t = await memcache.get("getFarcasterRepliesCount:" + e)) ? t.value : (t = await Casts.countDocuments({
    parentHash: e,
    deletedAt: null
  }), await memcache.set("getFarcasterRepliesCount:" + e, t), t) : 0;
}, getFarcasterFollowers = async (e, t, a) => {
  var [ r, s ] = a ? a.split("-") : [ null, null ];
  let i;
  (i = a && (n = await memcache.get(`getFarcasterFollowers:${e}:${t}:` + a)) ? JSON.parse(n.value).map(e => new Links(e)) : i) || (i = await Links.find({
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
  }).limit(t), a && await memcache.set(`getFarcasterFollowers:${e}:${t}:` + a, JSON.stringify(i)));
  var n = i.map(e => getFarcasterUserByFid(e.fid));
  let d = null;
  return [ (await Promise.all(n)).filter(e => !!e), d = i.length === t ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : d ];
}, getFarcasterCastReactions = async (e, t, a) => {
  var [ r, s ] = a ? a.split("-") : [ null, null ];
  let i;
  (i = a && (n = await memcache.get(`getFarcasterCastReactions:${e}:${t}:` + a)) ? JSON.parse(n.value).map(e => new Reactions(e)) : i) || (i = await Reactions.find({
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
  }).limit(t), a && await memcache.set(`getFarcasterCastReactions:${e}:${t}:` + a, JSON.stringify(i)));
  var n = i.map(e => getFarcasterUserByFid(e.fid));
  let d = null;
  return [ (await Promise.all(n)).filter(e => !!e), d = i.length === t ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : d ];
}, getFarcasterCastLikes = async (e, t, a) => {
  var [ r, s ] = a ? a.split("-") : [ null, null ];
  let i;
  (i = a && (n = await memcache.get(`getFarcasterCastLikes:${e}:${t}:` + a)) ? JSON.parse(n.value).map(e => new Reactions(e)) : i) || (i = await Reactions.find({
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
  }).limit(t), a && await memcache.set(`getFarcasterCastLikes:${e}:${t}:` + a, JSON.stringify(i)));
  var n = i.map(e => getFarcasterUserByFid(e.fid));
  let d = null;
  return [ (await Promise.all(n)).filter(e => !!e), d = i.length === t ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : d ];
}, getFarcasterCastRecasters = async (e, t, a) => {
  var [ r, s ] = a ? a.split("-") : [ null, null ];
  let i;
  (i = a && (n = await memcache.get(`getFarcasterCastRecasters:${e}:${t}:` + a)) ? JSON.parse(n.value).map(e => new Reactions(e)) : i) || (i = await Reactions.find({
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
  }).limit(t), a && await memcache.set(`getFarcasterCastRecasters:${e}:${t}:` + a, JSON.stringify(i)));
  var n = i.map(e => getFarcasterUserByFid(e.fid));
  let d = null;
  return [ (await Promise.all(n)).filter(e => !!e), d = i.length === t ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : d ];
}, getFarcasterFeed = async ({
  limit: e = 10,
  cursor: t = null,
  context: a = {},
  explore: r = !1
}) => {
  var [ s, i ] = t ? t.split("-") : [ null, null ], s = {
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
  i = await memcache.get(`getFarcasterFeed:${a?.fid || "global"}:${r}:${e}:` + t), 
  (n = i ? JSON.parse(i.value).map(e => new Casts(e)) : n) || (n = await Casts.find(s).sort({
    timestamp: -1
  }).limit(e), t ? await memcache.set(`getFarcasterFeed:${a?.fid || "global"}:${r}:${e}:` + t, JSON.stringify(n)) : await memcache.set(`getFarcasterFeed:${a?.fid || "global"}:${r}:${e}:` + t, JSON.stringify(n), {
    lifetime: 60
  })), i = n.map(e => getFarcasterFeedCastByHash(e.hash, a)), s = (await Promise.all(i)).filter(e => !(!e || e.parentHash && e.threadHash === e.hash));
  const d = {};
  r = s.reduce((e, t) => (t.author?.fid && (e[t.hash] || d[t.author.fid] ? d[t.author.fid] || t.childrenCasts.length > e[t.hash].childrenCasts.length && (e[t.hash] = t, 
  d[t.author.fid] = d[t.author.fid] ? d[t.author.fid] + 1 : 1) : (e[t.hash] = t, 
  d[t.author.fid] = d[t.author.fid] ? d[t.author.fid] + 1 : 1)), e), {});
  let l = null;
  return n.length >= e && (l = n[n.length - 1].timestamp.getTime() + "-" + n[n.length - 1].id), 
  [ Object.values(r), l ];
}, getFarcasterUnseenNotificationsCount = async ({
  lastSeen: e,
  context: t
}) => {
  var a;
  return t.fid ? (a = await memcache.get("getFarcasterUnseenNotificationsCount:" + t.fid)) ? a.value : (a = await Notifications.countDocuments({
    toFid: t.fid,
    timestamp: {
      $gt: e
    },
    deletedAt: null
  }), await memcache.set("getFarcasterUnseenNotificationsCount:" + t.fid, a), a) : 0;
}, getFarcasterNotifications = async ({
  limit: e,
  cursor: t,
  context: s
}) => {
  var a, [ r, i ] = t ? t.split("-") : [ null, null ];
  let n, d = ((n = t && (a = await memcache.get(`getFarcasterNotifications:${s.fid}:${e}:` + t)) ? JSON.parse(a.value).map(e => new Notifications(e)) : n) || (n = await Notifications.find({
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
  }).limit(e), t && await memcache.set(`getFarcasterNotifications:${s.fid}:${e}:` + t, JSON.stringify(n))), 
  null);
  return n.length === e && (d = n[n.length - 1].timestamp.getTime() + "-" + n[n.length - 1].id), 
  [ await Promise.all(n.map(async e => {
    var [ t, a ] = await Promise.all([ getFarcasterUserAndLinksByFid({
      fid: e.fromFid,
      context: s
    }), [ "reply", "mention", "reaction" ].includes(e.notificationType) ? getFarcasterCastByHash(e.payload.castHash, s) : null ]), r = {}, a = (a && (r.cast = a), 
    {
      type: e.notificationType,
      timestamp: e.timestamp.getTime(),
      actor: t,
      content: r,
      id: e.id
    });
    return "reaction" === e.notificationType && (a.reactionType = e.payload.reactionType), 
    a;
  })), d ];
}, getFarcasterStorageByFid = async e => {
  let t;
  var a = await memcache.get("getFarcasterStorageByFid:" + e);
  return (t = a ? JSON.parse(a.value).map(e => new Storage(e)) : t) || (t = await Storage.find({
    fid: e,
    deletedAt: null
  }), await memcache.set("getFarcasterStorageByFid:" + e, JSON.stringify(t))), t.forEach(e => {
    e.timestamp < new Date("2024-08-28T00:00:00Z") && (e.expiry = new Date(e.expiry.getTime() + 31536e6));
  }), t.map(e => ({
    timestamp: e.timestamp,
    fid: e.fid,
    units: e.units,
    expiry: e.expiry
  }));
}, getFarcasterSignersForFid = async e => {
  let t;
  var a = await memcache.get("getFarcasterSignersForFid:" + e);
  return (t = a ? JSON.parse(a.value).map(e => new Signers(e)) : t) || (t = await Signers.find({
    fid: e,
    deletedAt: null
  }), await memcache.set("getFarcasterSignersForFid:" + e, JSON.stringify(t))), 
  t.map(e => e.toJSON());
}, getLeaderboard = async ({
  scoreType: e,
  limit: t
}) => {
  e = await Score.getLeaderboard(e, t);
  return (await Promise.all(e.map(async e => {
    var t = e.address.toLowerCase(), [ t, a ] = await Promise.all([ getFarcasterUserByCustodyAddress(t), getFarcasterUserByFid(t) ]), t = t || a;
    return {
      ...e,
      profile: t
    };
  }))).filter(e => e.profile);
}, makeSignatureParams = ({
  publicKey: e,
  deadline: t
}) => {
  return e && t ? {
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
      deadline: ethers.BigNumber.from(t)
    }
  } : {};
}, getFidMetadataSignature = async ({
  publicKey: e,
  deadline: t
}) => {
  e = makeSignatureParams({
    publicKey: e,
    deadline: t
  });
  if (e.message) return (async e => {
    var t = config().FARCAST_KEY || config().MOCK_SIGNER_KEY;
    if (t) return t = ethers.Wallet.fromMnemonic(t), e = {
      domain: e.domain,
      types: e.types,
      message: e.message,
      primaryType: e.primaryType
    }, t._signTypedData(e.domain, e.types, e.message);
    throw new Error("Not configured!");
  })(e);
  throw new Error("Invalid signature params");
}, getFrame = async e => {
  return await Frames.findOne({
    hash: e
  });
}, getFrames = async ({
  limit: e,
  cursor: t
}) => {
  var [ a, r ] = t ? t.split("-") : [ null, null ], a = {
    createdAt: {
      $lt: a || Date.now()
    },
    id: {
      $lt: r || Number.MAX_SAFE_INTEGER
    }
  };
  let s, i = ((s = t && (r = await memcache.get(`getFrames:${e}:` + t)) ? JSON.parse(r.value).map(e => new Frames(e)) : s) || (s = await Frames.find(a).sort({
    createdAt: -1
  }).limit(e), t && await memcache.set(`getFrames:${e}:` + t, JSON.stringify(s))), 
  null);
  return s.length === e && (i = s[s.length - 1].createdAt.getTime() + "-" + s[s.length - 1].id), 
  [ s, i ];
}, createReport = async (e, t) => {
  var a, r;
  if (e) return a = (r = await Reports.findOne({
    fid: e
  }))?.count || 0, (r = new Set(r?.reporters || [])).add(t), a += 1, t = await Reports.findOneAndUpdate({
    fid: e
  }, {
    count: a,
    reporters: Array.from(r)
  }, {
    upsert: !0
  }), await memcache.set("algorithm_getReport:" + e, JSON.stringify(t)), t;
}, getActions = async ({
  limit: e,
  cursor: t
}) => {
  var [ a, r ] = t ? t.split("-") : [ null, null ], a = {
    createdAt: {
      $lt: a || Date.now()
    },
    id: {
      $lt: r || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null,
    rank: {
      $gt: -1
    }
  };
  let s, i = ((s = t && (r = await memcache.get(`getActions:${e}:` + t)) ? JSON.parse(r.value).map(e => new SyncedActions(e)) : s) || (s = await SyncedActions.find(a).sort("rank _id").limit(e), 
  t && await memcache.set(`getActions:${e}:` + t, JSON.stringify(s))), null);
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
  var t = "farPay:" + e;
  let a = await memcache.get(t);
  return a ? a = JSON.parse(a.value) : (a = await FarPay.findOne({
    uniqueId: e
  })) && await memcache.set(t, JSON.stringify(a)), a;
}, updateFarPay = async ({
  uniqueId: e,
  ...t
}) => {
  if (!e) throw new Error("Missing required uniqueId");
  t = await FarPay.findOneAndUpdate({
    uniqueId: e
  }, {
    $set: {
      txHash: t.txHash
    }
  }, {
    new: !0
  });
  if (t) return await memcache.delete("farPay:" + e), t;
  throw new Error("FarPay not found");
}, createFarPay = async ({
  ...e
}) => {
  var t;
  if (e.txId) return t = crypto.randomBytes(16).toString("hex"), await (t = new FarPay({
    uniqueId: t,
    txId: e.txId,
    data: JSON.stringify(e.data),
    callbackUrl: e.callbackUrl
  })).save(), t;
  throw new Error("Missing required fields");
}, getFarpayDeeplink = async ({
  txId: e,
  data: t,
  callbackUrl: a
}) => {
  var r = await createFarPay({
    txId: e,
    data: t,
    callbackUrl: a
  });
  return {
    deepLinkUrl: `farquest://?txId=${e}&data=${encodeURIComponent(JSON.stringify(t))}&uniqueId=${r.uniqueId}&callbackUrl=` + encodeURIComponent(a),
    uniqueId: r.uniqueId
  };
}, searchCastHandleByMatch = async (e, t = 10, a = "text") => {
  if (!e) return [];
  var r = escapeRegExp(e.toLowerCase()), s = "searchCastHandleByMatch:" + e, i = await memcache.get(getHash(s));
  if (i) return JSON.parse(i.value);
  let n;
  if ("development" === process.env.NODE_ENV) n = await CastHandle.find({
    handle: {
      $regex: "^" + r,
      $options: "i"
    }
  }).read("secondaryPreferred").limit(t).sort(a); else try {
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
    }).limit(t);
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
}, getUserNotificationDetails = async ({
  fid: e,
  appFid: t,
  webhookId: a
}) => {
  if (e && t && a) return (await FrameNotification.findOne({
    fid: e,
    appFid: t,
    webhookId: a,
    valid: !0
  }))?.notificationDetails;
  throw new Error("Missing required fields");
}, setUserNotificationDetails = async ({
  fid: e,
  appFid: t,
  webhookId: a,
  notificationDetails: r
}) => {
  if (!(e && t && a && r)) throw new Error("Missing required fields");
  await FrameNotification.updateOne({
    fid: e,
    appFid: t,
    webhookId: a
  }, {
    notificationDetails: r,
    valid: !0
  }, {
    upsert: !0
  });
}, deleteUserNotificationDetails = async ({
  fid: e,
  appFid: t,
  webhookId: a
}) => {
  if (!e || !t || !a) throw new Error("Missing required fields");
  await FrameNotification.updateOne({
    fid: e,
    appFid: t,
    webhookId: a,
    valid: !0
  }, {
    valid: !1
  });
}, sendFrameNotification = async ({
  fid: e,
  appFid: t,
  webhookId: a,
  title: r,
  body: s = "",
  targetUrl: i = "",
  notificationId: n = null
}) => {
  if (!(e && t && a && r)) throw new Error("Missing required fields");
  a = await getUserNotificationDetails({
    fid: e,
    appFid: t,
    webhookId: a
  });
  if (!a) return console.log("No notification details found for FID:", e, t), {
    state: "no_token"
  };
  try {
    var d = await fetch(a.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        notificationId: n || crypto.randomUUID(),
        title: r,
        body: s,
        targetUrl: i,
        tokens: [ a.token ]
      })
    }), l = await d.json();
    return console.log("responseBody", l), 200 === d.status ? {
      state: "success"
    } : {
      state: "error",
      error: l
    };
  } catch (e) {
    return console.error("Error sending frame notification:", e), {
      state: "error",
      error: e
    };
  }
};

function getFarcasterUserPrimaryAddress(e) {
  return e ? e.primaryAddress || (e.external ? e.fid : e.connectedAddress || (0 < e.allConnectedAddresses?.ethereum?.length ? e.allConnectedAddresses.ethereum[0] : e.custodyAddress)) : null;
}

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
  getConnectedAddressesForFid: getConnectedAddressesForFid,
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
  searchCastHandleByMatch: searchCastHandleByMatch,
  getFarcasterUserByAnyAddress: getFarcasterUserByAnyAddress,
  getFarcasterL1UserByAnyAddress: getFarcasterL1UserByAnyAddress,
  getUserNotificationDetails: getUserNotificationDetails,
  setUserNotificationDetails: setUserNotificationDetails,
  deleteUserNotificationDetails: deleteUserNotificationDetails,
  sendFrameNotification: sendFrameNotification,
  getFarcasterUserPrimaryAddress: getFarcasterUserPrimaryAddress
};
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
  SyncedActions
} = require("../models/farcaster"), mongoose = require("mongoose"), Score = require("../models/Score")["Score"], _AlchemyService = require("../services/AlchemyService")["Service"], {
  config,
  prod
} = require("../helpers/registrar"), getHexTokenIdFromLabel = require("../helpers/get-token-id-from-label")["getHexTokenIdFromLabel"], ethers = require("ethers")["ethers"], {
  getMemcachedClient,
  getHash
} = require("../connectmemcached"), {
  Message,
  fromFarcasterTime
} = require("@farcaster/hub-nodejs"), bs58 = require("bs58"), axios = require("axios");

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

const getSyncedChannelById = async e => {
  if (!e) return null;
  var t = getMemcachedClient(), a = "syncedChannel:" + e;
  try {
    var r, s = await t.get(a);
    return s ? JSON.parse(s.value) : ((r = await SyncedChannels.findOne({
      channelId: e
    })) && await t.set(a, JSON.stringify(r), {
      lifetime: 21600
    }), r);
  } catch (e) {
    return console.error("Failed to get synced channel by ID: " + e), null;
  }
}, getSyncedChannelByUrl = async e => {
  if (!e) return null;
  var t = getMemcachedClient(), a = "syncedChannel:" + e;
  try {
    var r, s = await t.get(a);
    return s ? JSON.parse(s.value) : ((r = await SyncedChannels.findOne({
      url: e
    })) && await t.set(a, JSON.stringify(r), {
      lifetime: 21600
    }), r);
  } catch (e) {
    return console.error("Failed to get synced channel by ID: " + e), null;
  }
}, searchChannels = async e => {
  if (!e) return [];
  var t = getMemcachedClient(), a = "searchChannels:" + e;
  try {
    var r, s = await t.get(a);
    return s ? JSON.parse(s.value) : (0 < (r = await SyncedChannels.aggregate([ {
      $match: {
        channelId: {
          $regex: new RegExp("^" + e, "i")
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
    } ])).length && await t.set(a, JSON.stringify(r), {
      lifetime: 21600
    }), r);
  } catch (e) {
    return console.error("Failed to search channels: " + e), [];
  }
}, postMessage = async ({
  isExternal: a = !1,
  externalFid: r,
  messageJSON: s,
  hubClient: n,
  errorHandler: t = e => console.error(e),
  bodyOverrides: i
}) => {
  try {
    let e = a, t = Message.fromJSON(s);
    var c, o;
    if (!e && [ MessageType.MESSAGE_TYPE_CAST_ADD, MessageType.MESSAGE_TYPE_CAST_REMOVE ].includes(t.type) && (t.data.type == MessageType.MESSAGE_TYPE_CAST_ADD && t.data.castAddBody.parentCastId ? (c = await Casts.findOne({
      hash: bytesToHex(t.data.castAddBody.parentCastId.hash)
    }), e = c?.external || e) : t.data.type == MessageType.MESSAGE_TYPE_CAST_REMOVE && (o = await Casts.findOne({
      hash: bytesToHex(t.data.castRemoveBody.targetHash)
    }), e = o?.external || e)), e && t.data.type === MessageType.MESSAGE_TYPE_USER_DATA_ADD && t.data.userDataBody.type === UserDataType.USER_DATA_TYPE_USERNAME) {
      var l = new _AlchemyService({
        apiKey: prod().NODE_URL,
        chain: prod().NODE_NETWORK
      }), d = new _AlchemyService({
        apiKey: prod().OPTIMISM_NODE_URL,
        chain: prod().OPTIMISM_NODE_NETWORK
      });
      let e = Buffer.from(t.data.userDataBody.value).toString("ascii").replace(".beb", "").replace(".cast", "");
      e.includes(".op") && (e = "op_" + e.replace(".op", ""));
      var g = getHexTokenIdFromLabel(e), [ u, h ] = await Promise.all([ l.getNFTs({
        owner: r,
        contractAddresses: [ prod().REGISTRAR_ADDRESS ]
      }), d.getNFTs({
        owner: r,
        contractAddresses: [ prod().OPTIMISM_REGISTRAR_ADDRESS ]
      }) ]), y = (u?.ownedNfts || []).concat(h?.ownedNfts || []).map(e => e.id?.tokenId).filter(e => e);
      if (!y.includes(g)) {
        var f = `Invalid UserData for external user, could not find ${e}/${g} in validPasses=` + y;
        if ("production" === process.env.NODE_ENV) throw new Error(f);
        console.error(f);
      }
    }
    if (!e) {
      var m = await n.submitMessage(t), F = m.unwrapOr(null);
      if (!F) throw new Error("Could not send message: " + m?.error);
      t = {
        ...F,
        hash: F.hash,
        signer: F.signer
      };
    }
    var p = new Date(), C = {
      fid: e ? r : t.data.fid,
      createdAt: p,
      updatedAt: p,
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
      bodyOverrides: i
    };
    try {
      await Messages.create(C);
    } catch (e) {
      if (11e3 !== (e?.code || 0)) throw e;
      console.error("Message with this hash already exists, skipping!");
    }
    return {
      result: C,
      source: "v2"
    };
  } catch (e) {
    throw t(e), e;
  }
}, GLOBAL_SCORE_THRESHOLD = 50, GLOBAL_SCORE_THRESHOLD_CHANNEL = 5, getFarcasterUserByFid = async e => {
  var t = getMemcachedClient();
  try {
    var a = await t.get("getFarcasterUserByFid:" + e);
    if (a) return JSON.parse(a.value);
  } catch (e) {
    console.error(e);
  }
  if (!e) return null;
  var [ a, r, s, n, i, c ] = await Promise.all([ getFarcasterFollowingCount(e), getFarcasterFollowersCount(e), UserData.find({
    fid: e,
    deletedAt: null
  }).sort({
    createdAt: 1
  }), Fids.findOne({
    fid: e,
    deletedAt: null
  }), getConnectedAddressForFid(e), getConnectedAddressesForFid(e) ]), o = {
    fid: e,
    followingCount: a,
    followerCount: r,
    pfp: {
      url: "",
      verified: !1
    },
    bio: {
      text: "",
      mentions: []
    },
    external: !1,
    custodyAddress: n?.custodyAddress,
    connectedAddress: i,
    allConnectedAddresses: c
  };
  let l = n?.timestamp;
  var d = {};
  for (const f of s) {
    f.external && (o.external = !0), l = l || f.createdAt, f.createdAt < l && (l = f.createdAt);
    var g = f.value.startsWith("0x") ? f.value.slice(2) : f.value, u = Buffer.from(g, "hex").toString("utf8");
    switch (f.type) {
     case UserDataType.USER_DATA_TYPE_USERNAME:
      d.username || (o.username = u, d.username = !0);
      break;

     case UserDataType.USER_DATA_TYPE_DISPLAY:
      d.displayName || (o.displayName = u, d.displayName = !0);
      break;

     case UserDataType.USER_DATA_TYPE_PFP:
      d.pfp || (o.pfp.url = u, d.pfp = !0);
      break;

     case UserDataType.USER_DATA_TYPE_BIO:
      if (!d.bio) {
        o.bio.text = u;
        for (var h, y = /(?<!\]\()@([a-zA-Z0-9_\-]+(\.[a-z]{2,})*)/g; h = y.exec(u); ) o.bio.mentions.push(h[1]);
        d.bio = !0;
      }
      break;

     case UserDataType.USER_DATA_TYPE_URL:
      d.url || (o.url = u, d.url = !0);
    }
  }
  o.registeredAt = l?.getTime();
  try {
    await t.set("getFarcasterUserByFid:" + e, JSON.stringify(o));
  } catch (e) {
    console.error(e);
  }
  return o;
}, getFarcasterUserAndLinksByFid = async ({
  fid: e,
  context: t
}) => {
  var a = await getFarcasterUserByFid(e);
  if (!t.fid || e === t.fid) return a;
  if (!a) return null;
  var r = getMemcachedClient();
  let s;
  try {
    var n = await r.get(`getFarcasterUserAndLinksByFid_${t.fid}:` + e);
    n && (s = JSON.parse(n.value));
  } catch (e) {
    console.error(e);
  }
  if (!s) {
    var [ n, i ] = await Promise.all([ Links.exists({
      fid: t.fid,
      targetFid: e,
      type: "follow",
      deletedAt: null
    }), Links.exists({
      fid: e,
      targetFid: t.fid,
      type: "follow",
      deletedAt: null
    }) ]);
    s = {
      isFollowing: n,
      isFollowedBy: i
    };
    try {
      await r.set(`getFarcasterUserAndLinksByFid_${t.fid}:` + e, JSON.stringify(s));
    } catch (e) {
      console.error(e);
    }
  }
  return {
    ...a,
    ...s
  };
}, getFarcasterUserByCustodyAddress = async e => {
  return (e = e && await Fids.findOne({
    custodyAddress: e,
    deletedAt: null
  })) ? getFarcasterUserByFid(e.fid) : null;
}, getFarcasterFidByCustodyAddress = async e => {
  if (!e) return null;
  var t = getMemcachedClient();
  try {
    var a = await t.get("getFarcasterFidByCustodyAddress:" + e);
    if (a) return a.value;
  } catch (e) {
    console.error(e);
  }
  return (await Fids.findOne({
    custodyAddress: e,
    deletedAt: null
  }))?.fid || null;
}, getFarcasterUserByConnectedAddress = async t => {
  var e = getMemcachedClient();
  let a = null;
  try {
    var r = await e.get("getFarcasterUserByConnectedAddress_fid:" + t);
    r && (a = r.value);
  } catch (e) {
    console.error(e);
  }
  if (!a) {
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
  try {
    await e.set("getFarcasterUserByConnectedAddress_fid:" + t, a);
  } catch (e) {
    console.error(e);
  }
  return "0" !== a ? getFarcasterUserByFid(a) : null;
}, getConnectedAddressForFid = async e => {
  if (!e) return null;
  var t = getMemcachedClient();
  try {
    var a = await t.get("getConnectedAddressForFid:" + e);
    if (a) return a.value;
  } catch (e) {
    console.error(e);
  }
  a = await Verifications.findOne({
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
  });
  if (!a) return null;
  a = a.claimObj || JSON.parse(a.claim);
  if (!a) return null;
  try {
    await t.set("getConnectedAddressForFid:" + e, a.address.toLowerCase());
  } catch (e) {
    console.error(e);
  }
  return a.address;
}, getConnectedAddressesForFid = async e => {
  if (!e) return [];
  var t = getMemcachedClient();
  try {
    var a = await t.get("getConnectedAddressesForFid:" + e);
    if (a) return JSON.parse(a.value);
  } catch (e) {
    console.error(e);
  }
  a = (await Verifications.find({
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
    return [ "ethereum", t.address.toLowerCase() ];
  });
  const r = {
    ethereum: new Set(),
    solana: new Set()
  };
  a.forEach(e => {
    r[e[0]].add(e[1]);
  }), Object.keys(r).forEach(e => {
    r[e] = Array.from(r[e]);
  });
  try {
    await t.set("getConnectedAddressesForFid:" + e, JSON.stringify(r));
  } catch (e) {
    console.error(e);
  }
  return r;
}, getCustodyAddressByFid = async e => {
  if (!e) return null;
  var t = getMemcachedClient();
  try {
    const a = await t.get("getCustodyAddressByFid:" + e);
    if (a) return a.value;
  } catch (e) {
    console.error(e);
  }
  const a = await Fids.findOne({
    fid: e,
    deletedAt: null
  }).read("secondaryPreferred");
  if (!a) return null;
  try {
    await t.set("getCustodyAddressByFid:" + e, a.custodyAddress);
  } catch (e) {
    console.error(e);
  }
  return a.custodyAddress;
}, getFidByCustodyAddress = async e => {
  if (!e) return null;
  var t = getMemcachedClient();
  try {
    var a = await t.get("getFidByCustodyAddress:" + e);
    if (a) return a.value;
  } catch (e) {
    console.error(e);
  }
  a = await Fids.findOne({
    custodyAddress: e,
    deletedAt: null
  }).read("secondaryPreferred");
  if (!a) return null;
  try {
    await t.set("getFidByCustodyAddress:" + e, a.fid);
  } catch (e) {
    console.error(e);
  }
  return a.fid;
}, searchFarcasterUserByMatch = async (e, t = 10, a = "value", r = !0) => {
  if (!e) return [];
  var s = "0x" + Buffer.from(e.toLowerCase(), "ascii").toString("hex");
  let n = "searchFarcasterUserByMatch:" + e;
  r || (n += ":noExternal");
  var i = getMemcachedClient();
  try {
    var c = await i.get(getHash(n));
    if (c) return JSON.parse(c.value);
  } catch (e) {
    console.error(e);
  }
  c = {
    $or: [ {
      value: {
        $regex: "^" + s
      },
      type: UserDataType.USER_DATA_TYPE_USERNAME,
      deletedAt: null
    }, {
      value: {
        $regex: "^" + s
      },
      type: UserDataType.USER_DATA_TYPE_DISPLAY,
      deletedAt: null
    }, {
      fid: e?.startsWith("0x") ? {
        $regex: "^" + e
      } : "" + e,
      deletedAt: null
    } ]
  }, r || (c.external = !1), s = await UserData.find(c).read("secondaryPreferred").limit(t).sort(a);
  const o = {};
  e = s.map(e => o[e.fid] ? null : (o[e.fid] = !0, e.fid)).filter(e => null !== e), 
  r = await Promise.all(e.map(e => getFarcasterUserByFid(e)));
  try {
    await i.set(getHash(n), JSON.stringify(r), {
      lifetime: 300
    });
  } catch (e) {
    console.error(e);
  }
  return r;
}, getFarcasterUserByUsername = async (e, t = 0) => {
  var a = "0x" + Buffer.from(e, "ascii").toString("hex");
  let r;
  var s = getMemcachedClient();
  try {
    var n = await s.get("getFarcasterUserByUsername_fid:" + e);
    n && (r = n.value);
  } catch (e) {
    console.error(e);
  }
  if (r || (n = await UserData.findOne({
    value: a,
    type: UserDataType.USER_DATA_TYPE_USERNAME,
    deletedAt: null
  }), r = n?.fid), r) {
    try {
      await s.set("getFarcasterUserByUsername_fid:" + e, r);
    } catch (e) {
      console.error(e);
    }
    return getFarcasterUserByFid(r);
  }
  return null;
}, getFarcasterUserAndLinksByUsername = async ({
  username: e,
  context: t
}) => {
  var a = "0x" + Buffer.from(e, "ascii").toString("hex");
  let r;
  var s = getMemcachedClient();
  try {
    var n = await s.get(getHash("getFarcasterUserAndLinksByUsername_fid:" + e));
    n && (r = n.value);
  } catch (e) {
    console.error(e);
  }
  if (r || (n = await UserData.findOne({
    value: a,
    type: UserDataType.USER_DATA_TYPE_USERNAME,
    deletedAt: null
  }), r = n?.fid), r) {
    try {
      await s.set(getHash("getFarcasterUserAndLinksByUsername_fid:" + e), r);
    } catch (e) {
      console.error(e);
    }
    return getFarcasterUserAndLinksByFid({
      fid: r,
      context: t
    });
  }
  return null;
}, getFarcasterCastByHash = async (t, a = {}, e = {}) => {
  var r = getMemcachedClient();
  let s, n;
  if (a.fid) {
    try {
      const T = await r.get(`getFarcasterCastByHash_${a.fid}:` + t);
      T && (s = JSON.parse(T.value));
    } catch (e) {
      console.error(e);
    }
    if (!s) {
      if (!(n = await Casts.findOne({
        hash: t,
        deletedAt: null
      }).read("secondaryPreferred"))) return null;
      var [ i, c ] = await Promise.all([ Reactions.exists({
        targetHash: n.hash,
        fid: a.fid,
        reactionType: ReactionType.REACTION_TYPE_LIKE,
        deletedAt: null
      }), Reactions.exists({
        targetHash: n.hash,
        fid: a.fid,
        reactionType: ReactionType.REACTION_TYPE_RECAST,
        deletedAt: null
      }) ]);
      s = {
        isSelfLike: i,
        isSelfRecast: c
      };
      try {
        await r.set(`getFarcasterCastByHash_${a.fid}:` + t, JSON.stringify(s));
      } catch (e) {
        console.error(e);
      }
    }
  }
  try {
    const T = await r.get("getFarcasterCastByHash:" + t);
    if (T) return (l = JSON.parse(T.value)).author && (l.author = await getFarcasterUserAndLinksByFid({
      fid: l.author.fid,
      context: a
    })), {
      ...l,
      ...s
    };
  } catch (e) {
    console.error(e);
  }
  if (!(n = n || await Casts.findOne({
    hash: t,
    deletedAt: null
  }))) return null;
  let o;
  e.includeReply && (o = (o = await Casts.findOne({
    parentHash: n.hash,
    deletedAt: null
  })) && await getFarcasterCastByHash(o.hash, a, !1));
  var i = [ getFarcasterRepliesCount(n.hash), getFarcasterReactionsCount(n.hash, ReactionType.REACTION_TYPE_LIKE), getFarcasterReactionsCount(n.hash, ReactionType.REACTION_TYPE_RECAST), getFarcasterUserByFid(n.parentFid), getFarcasterUserAndLinksByFid({
    fid: n.fid,
    context: a
  }), getSyncedChannelByUrl(n.parentUrl), Promise.all(n.mentions.map(e => getFarcasterUserByFid(e))) ], c = JSON.parse(n.embeds), l = c.urls?.filter(e => "castId" === e.type && !a.quotedCasts?.[e.hash]).map(e => getFarcasterCastByHash(e.hash, {
    ...a,
    quotedCasts: {
      [e.hash]: !0
    }
  })) || [], [ e, l, i, d, g, u, h, y ] = (i.push(Promise.all(l)), await Promise.all(i)), f = n.text;
  let m = 0;
  var F, p, C, w, A, S = [];
  let v = Buffer.from(f, "utf-8");
  for (let e = 0; e < h.length; e++) h[e] && (C = n.mentionsPositions[e], F = h[e].username || "fid:" + h[e].fid, 
  F = Buffer.from("@" + F, "utf-8"), p = h[e].originalMention || "", p = Buffer.from(p, "utf-8").length, 
  C = C + m, w = v.slice(0, C), A = v.slice(C + p), v = Buffer.concat([ w, F, A ]), 
  m += F.length - p, S.push(C));
  f = v.toString("utf-8");
  const T = {
    hash: n.hash,
    parentHash: n.parentHash,
    parentFid: n.parentFid,
    parentUrl: n.parentUrl,
    threadHash: n.threadHash,
    text: f,
    embeds: {
      ...c,
      quoteCasts: y
    },
    mentions: h,
    mentionsPositions: S,
    external: n.external,
    author: g,
    parentAuthor: d,
    timestamp: n.timestamp.getTime(),
    replies: {
      count: e,
      reply: o
    },
    reactions: {
      count: l
    },
    recasts: {
      count: i
    },
    channel: u,
    deletedAt: n.deletedAt
  };
  try {
    await r.set("getFarcasterCastByHash:" + t, JSON.stringify(T));
  } catch (e) {
    console.error("getFarcasterCastByHash:" + t, e);
  }
  return {
    ...T,
    ...s
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
  var r = getMemcachedClient();
  let s;
  try {
    var n = await r.get("getFarcasterCastByShortHash:" + e);
    n && (s = n.value);
  } catch (e) {
    console.error(e);
  }
  if (!s) {
    n = await Casts.findOne({
      hash: {
        $regex: "^" + e
      },
      fid: t.fid,
      deletedAt: null
    });
    if (!n) return null;
    s = n.hash;
  }
  try {
    await r.set("getFarcasterCastByShortHash:" + e, s);
  } catch (e) {
    console.error(e);
  }
  return getFarcasterCastByHash(s, a);
}, getFarcasterCastsInThread = async ({
  threadHash: e,
  parentHash: t,
  limit: a,
  cursor: r,
  context: s
}) => {
  var n = getMemcachedClient(), [ i, c ] = r ? r.split("-") : [ null, null ];
  let o;
  try {
    var l = await n.get(`getFarcasterCastsInThread:${e}:${t}:${a}:` + r);
    l && (o = JSON.parse(l.value).map(e => new Casts(e)));
  } catch (e) {
    console.error(e);
  }
  l = {
    threadHash: e,
    deletedAt: null,
    timestamp: {
      $lt: i || Date.now()
    },
    id: {
      $lt: c || Number.MAX_SAFE_INTEGER
    }
  };
  if (t && (l.parentHash = t), !o) {
    o = await Casts.find(l).sort({
      timestamp: -1
    }).limit(a);
    try {
      await n.set(`getFarcasterCastsInThread:${e}:${t}:${a}:` + r, JSON.stringify(o), {
        lifetime: 60
      });
    } catch (e) {
      console.error(e);
    }
  }
  i = await Promise.all(o.map(async e => {
    e = await getFarcasterCastByHash(e.hash, s, {
      includeReply: !0
    });
    return e ? {
      ...e,
      childrenCasts: e.replies?.reply ? [ e.replies.reply ] : []
    } : null;
  })), c = await getFarcasterCastByHash(e, s);
  let d = t;
  for (var g = []; d && d !== e; ) {
    var u = await getFarcasterCastByHash(d, s);
    if (!u) break;
    g.push(u), d = u.parentHash;
  }
  let h = null;
  o.length === a && (h = o[o.length - 1].timestamp.getTime() + "-" + o[o.length - 1].id);
  const y = new Map();
  return [ c, ...g, ...i ].forEach(e => {
    e && !y.has(e.hash) && y.set(e.hash, e);
  }), [ Array.from(y.values()), h ];
}, getFarcasterCasts = async ({
  fid: e,
  parentChain: t,
  limit: a,
  cursor: r,
  context: s,
  explore: n = !1,
  filters: i = {}
}) => {
  var [ c, o ] = r ? r.split("-") : [ null, null ], l = getMemcachedClient(), c = {
    timestamp: {
      $lt: c || Date.now()
    },
    id: {
      $lt: o || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null
  };
  i?.noReplies ? c.parentHash = null : i?.repliesOnly && (c.parentHash = {
    $ne: null
  }), e && (c.fid = e), t && (c.parentUrl = t, n) && (c.globalScore = {
    $gt: GLOBAL_SCORE_THRESHOLD_CHANNEL
  });
  let d;
  if (r) try {
    var g = await l.get(`getFarcasterCasts:${e}:${t}:${a}:${r}:` + n);
    g && (d = JSON.parse(g.value).map(e => new Casts(e)));
  } catch (e) {
    console.error(e);
  }
  if (!d && (d = await Casts.find(c).sort({
    timestamp: -1
  }).limit(a), r)) try {
    await l.set(`getFarcasterCasts:${e}:${t}:${a}:${r}:` + n, JSON.stringify(d));
  } catch (e) {
    console.error(e);
  }
  o = d.map(e => getFarcasterCastByHash(e.hash, s)), i = (await Promise.all(o)).filter(e => e), 
  g = i.map(e => {
    return e.parentHash ? getFarcasterCastByHash(e.parentHash, s) : e;
  });
  const u = await Promise.all(g);
  let h = null;
  return [ i.map((e, t) => e.parentHash && u[t] ? {
    ...u[t],
    childCast: e,
    childrenCasts: [ e ]
  } : e), h = d.length === a ? d[d.length - 1].timestamp.getTime() + "-" + d[d.length - 1].id : h ];
}, searchFarcasterCasts = async ({}) => {
  throw new Error("searchFarcasterCasts is unavailable, index is removed - it wasn't fast.");
}, getFarcasterFollowingCount = async e => {
  var t = getMemcachedClient();
  try {
    var a = await t.get("getFarcasterFollowingCount:" + e);
    if (a) return a.value;
  } catch (e) {
    console.error(e);
  }
  a = await Links.count({
    fid: e,
    type: "follow",
    deletedAt: null
  });
  try {
    await t.set("getFarcasterFollowingCount:" + e, a);
  } catch (e) {
    console.error(e);
  }
  return a;
}, getFarcasterFollowing = async (e, t, a) => {
  var [ r, s ] = a ? a.split("-") : [ null, null ], n = getMemcachedClient();
  let i;
  if (a) try {
    var c = await n.get(`getFarcasterFollowing:${e}:${t}:` + a);
    c && (i = JSON.parse(c.value).map(e => new Links(e)));
  } catch (e) {
    console.error(e);
  }
  if (!i && (i = await Links.find({
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
  }).limit(t), a)) try {
    await n.set(`getFarcasterFollowing:${e}:${t}:` + a, JSON.stringify(i));
  } catch (e) {
    console.error(e);
  }
  c = i.map(e => getFarcasterUserByFid(e.targetFid));
  let o = null;
  return [ await Promise.all(c), o = i.length === t ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : o ];
}, getFarcasterFollowersCount = async e => {
  var t = getMemcachedClient();
  try {
    var a = await t.get("getFarcasterFollowersCount:" + e);
    if (a) return a.value;
  } catch (e) {
    console.error(e);
  }
  a = await Links.count({
    targetFid: e,
    type: "follow",
    deletedAt: null
  });
  try {
    await t.set("getFarcasterFollowersCount:" + e, a);
  } catch (e) {
    console.error(e);
  }
  return a;
}, getFarcasterReactionsCount = async (e, t) => {
  var a = getMemcachedClient();
  try {
    var r = await a.get(`getFarcasterReactionsCount:${e}:` + t);
    if (r) return r.value;
  } catch (e) {
    console.error(e);
  }
  r = await Reactions.count({
    targetHash: e,
    reactionType: t,
    deletedAt: null
  });
  try {
    await a.set(`getFarcasterReactionsCount:${e}:` + t, r);
  } catch (e) {
    console.error(e);
  }
  return r;
}, getFarcasterRepliesCount = async e => {
  var t = getMemcachedClient();
  try {
    var a = await t.get("getFarcasterRepliesCount:" + e);
    if (a) return a.value;
  } catch (e) {
    console.error(e);
  }
  a = await Casts.count({
    parentHash: e,
    deletedAt: null
  });
  try {
    await t.set("getFarcasterRepliesCount:" + e, a);
  } catch (e) {
    console.error(e);
  }
  return a;
}, getFarcasterFollowers = async (e, t, a) => {
  var [ r, s ] = a ? a.split("-") : [ null, null ], n = getMemcachedClient();
  let i;
  if (a) try {
    var c = await n.get(`getFarcasterFollowers:${e}:${t}:` + a);
    c && (i = JSON.parse(c.value).map(e => new Links(e)));
  } catch (e) {
    console.error(e);
  }
  if (!i && (i = await Links.find({
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
  }).limit(t), a)) try {
    await n.set(`getFarcasterFollowers:${e}:${t}:` + a, JSON.stringify(i));
  } catch (e) {
    console.error(e);
  }
  c = i.map(e => getFarcasterUserByFid(e.fid));
  let o = null;
  return [ await Promise.all(c), o = i.length === t ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : o ];
}, getFarcasterCastReactions = async (e, t, a) => {
  var r = getMemcachedClient(), [ s, n ] = a ? a.split("-") : [ null, null ];
  let i;
  if (a) try {
    var c = await r.get(`getFarcasterCastReactions:${e}:${t}:` + a);
    c && (i = JSON.parse(c.value).map(e => new Reactions(e)));
  } catch (e) {
    console.error(e);
  }
  if (!i && (i = await Reactions.find({
    targetHash: e,
    timestamp: {
      $lt: s || Date.now()
    },
    id: {
      $lt: n || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null
  }).sort({
    timestamp: -1
  }).limit(t), a)) try {
    await r.set(`getFarcasterCastReactions:${e}:${t}:` + a, JSON.stringify(i));
  } catch (e) {
    console.error(e);
  }
  c = i.map(e => getFarcasterUserByFid(e.fid));
  let o = null;
  return [ await Promise.all(c), o = i.length === t ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : o ];
}, getFarcasterCastLikes = async (e, t, a) => {
  var [ r, s ] = a ? a.split("-") : [ null, null ], n = getMemcachedClient();
  let i;
  if (a) try {
    var c = await n.get(`getFarcasterCastLikes:${e}:${t}:` + a);
    c && (i = JSON.parse(c.value).map(e => new Reactions(e)));
  } catch (e) {
    console.error(e);
  }
  if (!i && (i = await Reactions.find({
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
  }).limit(t), a)) try {
    await n.set(`getFarcasterCastLikes:${e}:${t}:` + a, JSON.stringify(i));
  } catch (e) {
    console.error(e);
  }
  c = i.map(e => getFarcasterUserByFid(e.fid));
  let o = null;
  return [ await Promise.all(c), o = i.length === t ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : o ];
}, getFarcasterCastRecasters = async (e, t, a) => {
  var [ r, s ] = a ? a.split("-") : [ null, null ], n = getMemcachedClient();
  let i;
  if (a) try {
    var c = await n.get(`getFarcasterCastRecasters:${e}:${t}:` + a);
    c && (i = JSON.parse(c.value).map(e => new Reactions(e)));
  } catch (e) {
    console.error(e);
  }
  if (!i && (i = await Reactions.find({
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
  }).limit(t), a)) try {
    await n.set(`getFarcasterCastRecasters:${e}:${t}:` + a, JSON.stringify(i));
  } catch (e) {
    console.error(e);
  }
  c = i.map(e => getFarcasterUserByFid(e.fid));
  let o = null;
  return [ await Promise.all(c), o = i.length === t ? i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id : o ];
}, getFarcasterFeed = async ({
  limit: e = 10,
  cursor: t = null,
  context: a = {},
  explore: r = !1
}) => {
  var s = getMemcachedClient(), [ n, i ] = t ? t.split("-") : [ null, null ], n = {
    timestamp: {
      $lt: n || Date.now()
    },
    id: {
      $lt: i || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null
  };
  r && (n.globalScore = {
    $gt: GLOBAL_SCORE_THRESHOLD
  });
  let c;
  try {
    var o = await s.get(`getFarcasterFeed:${a?.fid || "global"}:${r}:${e}:` + t);
    o && (c = JSON.parse(o.value).map(e => new Casts(e)));
  } catch (e) {
    console.error(e);
  }
  if (!c) {
    c = await Casts.find(n).sort({
      timestamp: -1
    }).limit(e);
    try {
      t ? await s.set(`getFarcasterFeed:${a?.fid || "global"}:${r}:${e}:` + t, JSON.stringify(c)) : await s.set(`getFarcasterFeed:${a?.fid || "global"}:${r}:${e}:` + t, JSON.stringify(c), {
        lifetime: 60
      });
    } catch (e) {
      console.error(e);
    }
  }
  i = c.map(e => getFarcasterFeedCastByHash(e.hash, a)), o = (await Promise.all(i)).filter(e => !(!e || e.parentHash && e.threadHash === e.hash));
  const l = {};
  n = o.reduce((e, t) => (t.author?.fid && (e[t.hash] || l[t.author.fid] ? l[t.author.fid] || t.childrenCasts.length > e[t.hash].childrenCasts.length && (e[t.hash] = t, 
  l[t.author.fid] = l[t.author.fid] ? l[t.author.fid] + 1 : 1) : (e[t.hash] = t, 
  l[t.author.fid] = l[t.author.fid] ? l[t.author.fid] + 1 : 1)), e), {});
  let d = null;
  return c.length >= e && (d = c[c.length - 1].timestamp.getTime() + "-" + c[c.length - 1].id), 
  [ Object.values(n), d ];
}, getFarcasterUnseenNotificationsCount = async ({
  lastSeen: e,
  context: t
}) => {
  if (!t.fid) return 0;
  var a = getMemcachedClient();
  try {
    var r = await a.get("getFarcasterUnseenNotificationsCount:" + t.fid);
    if (r) return r.value;
  } catch (e) {
    console.error(e);
  }
  r = await Notifications.count({
    toFid: t.fid,
    timestamp: {
      $gt: e
    },
    deletedAt: null
  });
  try {
    await a.set("getFarcasterUnseenNotificationsCount:" + t.fid, r);
  } catch (e) {
    console.error(e);
  }
  return r;
}, getFarcasterNotifications = async ({
  limit: e,
  cursor: t,
  context: r
}) => {
  var [ a, s ] = t ? t.split("-") : [ null, null ], n = getMemcachedClient();
  let i;
  try {
    const o = await n.get(t ? `getFarcasterNotifications:${r.fid}:${e}:` + t : "getFarcasterNotifications:" + r.fid);
    o && (i = JSON.parse(o.value).map(e => new Notifications(e)));
  } catch (e) {
    console.error(e);
  }
  if (!i && (i = await Notifications.find({
    toFid: r.fid,
    timestamp: {
      $lt: a || Date.now()
    },
    fromFid: {
      $ne: r.fid
    },
    id: {
      $lt: s || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null
  }).sort({
    timestamp: -1
  }).limit(e), t)) try {
    await n.set(t ? `getFarcasterNotifications:${r.fid}:${e}:` + t : "getFarcasterNotifications:" + r.fid, JSON.stringify(i));
  } catch (e) {
    console.error(e);
  }
  let c = null;
  i.length === e && (c = i[i.length - 1].timestamp.getTime() + "-" + i[i.length - 1].id);
  const o = await Promise.all(i.map(async e => {
    var t = await getFarcasterUserAndLinksByFid({
      fid: e.fromFid,
      context: r
    }), a = {}, t = ([ "reply", "mention", "reaction" ].includes(e.notificationType) && (a.cast = await getFarcasterCastByHash(e.payload.castHash, r)), 
    {
      type: e.notificationType,
      timestamp: e.timestamp.getTime(),
      actor: t,
      content: a,
      id: e.id
    });
    return "reaction" === e.notificationType && (t.reactionType = e.payload.reactionType), 
    t;
  }));
  return [ o, c ];
}, getFarcasterStorageByFid = async e => {
  var t = getMemcachedClient();
  let a;
  try {
    var r = await t.get("getFarcasterStorageByFid:" + e);
    r && (a = JSON.parse(r.value).map(e => new Storage(e)));
  } catch (e) {
    console.error(e);
  }
  if (!a) {
    a = await Storage.find({
      fid: e,
      deletedAt: null
    }).read("secondaryPreferred");
    try {
      await t.set("getFarcasterStorageByFid:" + e, JSON.stringify(a));
    } catch (e) {
      console.error(e);
    }
  }
  return a.map(e => ({
    timestamp: e.timestamp,
    fid: e.fid,
    units: e.units,
    expiry: e.expiry
  }));
}, getLeaderboard = async ({
  scoreType: e,
  limit: t,
  context: a
}) => {
  e = await Score.getLeaderboard(e, t);
  return await Promise.all(e.map(async e => {
    var t = await getFarcasterUserAndLinksByFid({
      fid: e.account.recoverers?.[0]?.id,
      context: a
    });
    return {
      ...e,
      profile: t
    };
  }));
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
}, createFrame = async (e = {}) => {
  var t = {
    frameButton1: {
      text: e["fc:frame:button:1"],
      action: e["fc:frame:button:1:action"],
      target: e["fc:frame:button:1:target"]
    },
    frameButton2: {
      text: e["fc:frame:button:2"],
      action: e["fc:frame:button:2:action"],
      target: e["fc:frame:button:2:target"]
    },
    frameButton3: {
      text: e["fc:frame:button:3"],
      action: e["fc:frame:button:3:action"],
      target: e["fc:frame:button:3:target"]
    },
    frameButton4: {
      text: e["fc:frame:button:4"],
      action: e["fc:frame:button:4:action"],
      target: e["fc:frame:button:4:target"]
    },
    frameInputText: e["fc:frame:input:text"],
    frameImageUrl: e["fc:frame:image"],
    framePostUrl: e["fc:frame:post_url"],
    image: e.image,
    title: e.title,
    sourceUrl: e.sourceUrl,
    description: e.description,
    domain: e.domain
  };
  return e.hash ? Frames.findOneAndUpdate({
    hash: e.hash
  }, {
    ...t
  }, {
    upsert: !0
  }) : Frames.create({
    ...t
  });
}, getFrame = async e => {
  return await Frames.findOne({
    hash: e
  });
}, getFrames = async ({
  limit: e,
  cursor: t
}) => {
  var [ a, r ] = t ? t.split("-") : [ null, null ], s = getMemcachedClient(), a = {
    createdAt: {
      $lt: a || Date.now()
    },
    id: {
      $lt: r || Number.MAX_SAFE_INTEGER
    }
  };
  let n;
  if (!n && (n = await Frames.find(a).sort({
    createdAt: -1
  }).limit(e), t)) try {
    await s.set(`getFrames:${e}:` + t, JSON.stringify(n));
  } catch (e) {
    console.error(e);
  }
  let i = null;
  return n.length === e && (i = n[n.length - 1].createdAt.getTime() + "-" + n[n.length - 1].id), 
  [ n, i ];
}, createReport = async (e, t) => {
  var a = getMemcachedClient();
  if (e) {
    var r = await Reports.findOne({
      fid: e
    }), s = r?.count || 0, r = new Set(r?.reporters || []), t = (r.add(t), s += 1, 
    await Reports.findOneAndUpdate({
      fid: e
    }, {
      count: s,
      reporters: Array.from(r)
    }, {
      upsert: !0
    }));
    try {
      await a.set("algorithm_getReport:" + e, JSON.stringify(t));
    } catch (e) {
      console.error(e);
    }
    return t;
  }
}, getActions = async ({
  limit: e,
  cursor: t
}) => {
  var [ a, r ] = t ? t.split("-") : [ null, null ], s = getMemcachedClient(), a = {
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
  let n;
  try {
    var i = await s.get(`getActions:${e}:` + t);
    i && (n = JSON.parse(i.value).map(e => new SyncedActions(e)));
  } catch (e) {
    console.error(e);
  }
  let c = null;
  return (n = n || await SyncedActions.find(a).sort("rank _id").limit(e)).length === e && (c = n[n.length - 1].createdAt.getTime() + "-" + n[n.length - 1].id), 
  [ n, c ];
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
  getFarcasterStorageByFid: getFarcasterStorageByFid,
  getLeaderboard: getLeaderboard,
  getFidMetadataSignature: getFidMetadataSignature,
  createFrame: createFrame,
  getFrame: getFrame,
  getFrames: getFrames,
  createReport: createReport,
  getSyncedChannelById: getSyncedChannelById,
  getSyncedChannelByUrl: getSyncedChannelByUrl,
  searchChannels: searchChannels,
  searchFarcasterCasts: searchFarcasterCasts,
  isFollowingChannel: isFollowingChannel,
  getActions: getActions,
  createAction: createAction
};
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
  hubClient: i,
  errorHandler: t = e => console.error(e),
  bodyOverrides: n
}) => {
  try {
    let e = a, t = Message.fromJSON(s);
    var l, c;
    if (!e && [ MessageType.MESSAGE_TYPE_CAST_ADD, MessageType.MESSAGE_TYPE_CAST_REMOVE ].includes(t.type) && (t.data.type == MessageType.MESSAGE_TYPE_CAST_ADD && t.data.castAddBody.parentCastId ? (l = await Casts.findOne({
      hash: bytesToHex(t.data.castAddBody.parentCastId.hash)
    }), e = l?.external || e) : t.data.type == MessageType.MESSAGE_TYPE_CAST_REMOVE && (c = await Casts.findOne({
      hash: bytesToHex(t.data.castRemoveBody.targetHash)
    }), e = c?.external || e)), e && t.data.type === MessageType.MESSAGE_TYPE_USER_DATA_ADD && t.data.userDataBody.type === UserDataType.USER_DATA_TYPE_USERNAME) {
      var o = new _AlchemyService({
        apiKey: prod().NODE_URL,
        chain: prod().NODE_NETWORK
      }), d = new _AlchemyService({
        apiKey: prod().OPTIMISM_NODE_URL,
        chain: prod().OPTIMISM_NODE_NETWORK
      });
      let e = Buffer.from(t.data.userDataBody.value).toString("ascii").replace(".beb", "").replace(".cast", "");
      e.includes(".op") && (e = "op_" + e.replace(".op", ""));
      var g = getHexTokenIdFromLabel(e), [ u, h ] = await Promise.all([ o.getNFTs({
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
      var m = await i.submitMessage(t), F = m.unwrapOr(null);
      if (!F) throw new Error("Could not send message: " + m?.error);
      t = {
        ...F,
        hash: F.hash,
        signer: F.signer
      };
    }
    var p = new Date(), w = {
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
      bodyOverrides: n
    };
    try {
      await Messages.create(w);
    } catch (e) {
      if (11e3 !== (e?.code || 0)) throw e;
      console.error("Message with this hash already exists, skipping!");
    }
    return {
      result: w,
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
  var [ a, r, s, i, n, l ] = await Promise.all([ getFarcasterFollowingCount(e), getFarcasterFollowersCount(e), UserData.find({
    fid: e,
    deletedAt: null
  }).sort({
    createdAt: 1
  }), Fids.findOne({
    fid: e,
    deletedAt: null
  }), getConnectedAddressForFid(e), getConnectedAddressesForFid(e) ]), c = {
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
    custodyAddress: i?.custodyAddress,
    connectedAddress: n,
    allConnectedAddresses: l
  };
  let o = i?.timestamp;
  var d = {};
  for (const f of s) {
    f.external && (c.external = !0), o = o || f.createdAt, f.createdAt < o && (o = f.createdAt);
    var g = f.value.startsWith("0x") ? f.value.slice(2) : f.value, u = Buffer.from(g, "hex").toString("utf8");
    switch (f.type) {
     case UserDataType.USER_DATA_TYPE_USERNAME:
      d.username || (c.username = u, d.username = !0);
      break;

     case UserDataType.USER_DATA_TYPE_DISPLAY:
      d.displayName || (c.displayName = u, d.displayName = !0);
      break;

     case UserDataType.USER_DATA_TYPE_PFP:
      d.pfp || (c.pfp.url = u, d.pfp = !0);
      break;

     case UserDataType.USER_DATA_TYPE_BIO:
      if (!d.bio) {
        c.bio.text = u;
        for (var h, y = /(?<!\]\()@([a-zA-Z0-9_\-]+(\.[a-z]{2,})*)/g; h = y.exec(u); ) c.bio.mentions.push(h[1]);
        d.bio = !0;
      }
      break;

     case UserDataType.USER_DATA_TYPE_URL:
      d.url || (c.url = u, d.url = !0);
    }
  }
  c.registeredAt = o?.getTime();
  try {
    await t.set("getFarcasterUserByFid:" + e, JSON.stringify(c));
  } catch (e) {
    console.error(e);
  }
  return c;
}, isFollowingFid = async ({
  fid: e,
  targetFid: t
}) => {
  var a = getMemcachedClient();
  try {
    var r, s = await a.get(`getIsFollowing:${e}:` + t);
    return s ? s.value : (r = await Links.exists({
      fid: e,
      targetFid: t,
      type: "follow",
      deletedAt: null
    }), await a.set(`getIsFollowing:${e}:` + t, r, {
      lifetime: 3600
    }), r);
  } catch (e) {
    console.error(e);
  }
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
    var i = await r.get(`getFarcasterUserAndLinksByFid_${t.fid}:` + e);
    i && (s = JSON.parse(i.value));
  } catch (e) {
    console.error(e);
  }
  if (!s) {
    var [ i, n ] = await Promise.all([ Links.exists({
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
      isFollowing: i,
      isFollowedBy: n
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
  });
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
  });
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
  let i = "searchFarcasterUserByMatch:" + e;
  r || (i += ":noExternal");
  var n = getMemcachedClient();
  try {
    var l = await n.get(getHash(i));
    if (l) return JSON.parse(l.value);
  } catch (e) {
    console.error(e);
  }
  l = {
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
  }, r || (l.external = !1), s = await UserData.find(l).limit(t).sort(a);
  const c = {};
  e = s.map(e => c[e.fid] ? null : (c[e.fid] = !0, e.fid)).filter(e => null !== e), 
  r = await Promise.all(e.map(e => getFarcasterUserByFid(e)));
  try {
    await n.set(getHash(i), JSON.stringify(r), {
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
    var i = await s.get("getFarcasterUserByUsername_fid:" + e);
    i && (r = i.value);
  } catch (e) {
    console.error(e);
  }
  if (r || (i = await UserData.findOne({
    value: a,
    type: UserDataType.USER_DATA_TYPE_USERNAME,
    deletedAt: null
  }), r = i?.fid), r) {
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
    var i = await s.get(getHash("getFarcasterUserAndLinksByUsername_fid:" + e));
    i && (r = i.value);
  } catch (e) {
    console.error(e);
  }
  if (r || (i = await UserData.findOne({
    value: a,
    type: UserDataType.USER_DATA_TYPE_USERNAME,
    deletedAt: null
  }), r = i?.fid), r) {
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
  let s, i;
  if (a.fid) {
    try {
      const v = await r.get(`getFarcasterCastByHash_${a.fid}:` + t);
      v && (s = JSON.parse(v.value));
    } catch (e) {
      console.error(e);
    }
    if (!s) {
      if (!(i = await Casts.findOne({
        hash: t,
        deletedAt: null
      }))) return null;
      var [ n, l ] = await Promise.all([ Reactions.exists({
        targetHash: i.hash,
        fid: a.fid,
        reactionType: ReactionType.REACTION_TYPE_LIKE,
        deletedAt: null
      }), Reactions.exists({
        targetHash: i.hash,
        fid: a.fid,
        reactionType: ReactionType.REACTION_TYPE_RECAST,
        deletedAt: null
      }) ]);
      s = {
        isSelfLike: n,
        isSelfRecast: l
      };
      try {
        await r.set(`getFarcasterCastByHash_${a.fid}:` + t, JSON.stringify(s));
      } catch (e) {
        console.error(e);
      }
    }
  }
  try {
    const v = await r.get("getFarcasterCastByHash:" + t);
    if (v) return (o = JSON.parse(v.value)).author && (o.author = await getFarcasterUserAndLinksByFid({
      fid: o.author.fid,
      context: a
    })), {
      ...o,
      ...s
    };
  } catch (e) {
    console.error(e);
  }
  if (!(i = i || await Casts.findOne({
    hash: t,
    deletedAt: null
  }))) return null;
  let c;
  e.includeReply && (c = (c = await Casts.findOne({
    parentHash: i.hash,
    deletedAt: null
  })) && await getFarcasterCastByHash(c.hash, a, !1));
  var n = [ Casts.count({
    parentHash: i.hash,
    deletedAt: null
  }), Reactions.count({
    targetHash: i.hash,
    reactionType: ReactionType.REACTION_TYPE_LIKE,
    deletedAt: null
  }), Reactions.count({
    targetHash: i.hash,
    reactionType: ReactionType.REACTION_TYPE_RECAST,
    deletedAt: null
  }), getFarcasterUserByFid(i.parentFid), getFarcasterUserAndLinksByFid({
    fid: i.fid,
    context: a
  }), getSyncedChannelByUrl(i.parentUrl), Promise.all(i.mentions.map(e => getFarcasterUserByFid(e))) ], l = JSON.parse(i.embeds), o = l.urls?.filter(e => "castId" === e.type && !a.quotedCasts?.[e.hash]).map(e => getFarcasterCastByHash(e.hash, {
    ...a,
    quotedCasts: {
      [e.hash]: !0
    }
  })) || [], [ e, o, n, d, g, u, h, y ] = (n.push(Promise.all(o)), await Promise.all(n)), f = i.text;
  let m = 0;
  var F, p, w, A, C, S = [];
  let T = Buffer.from(f, "utf-8");
  for (let e = 0; e < h.length; e++) h[e] && (w = i.mentionsPositions[e], F = h[e].username || "fid:" + h[e].fid, 
  F = Buffer.from("@" + F, "utf-8"), p = h[e].originalMention || "", p = Buffer.from(p, "utf-8").length, 
  w = w + m, A = T.slice(0, w), C = T.slice(w + p), T = Buffer.concat([ A, F, C ]), 
  m += F.length - p, S.push(w));
  f = T.toString("utf-8");
  const v = {
    hash: i.hash,
    parentHash: i.parentHash,
    parentFid: i.parentFid,
    parentUrl: i.parentUrl,
    threadHash: i.threadHash,
    text: f,
    embeds: {
      ...l,
      quoteCasts: y
    },
    mentions: h,
    mentionsPositions: S,
    external: i.external,
    author: g,
    parentAuthor: d,
    timestamp: i.timestamp.getTime(),
    replies: {
      count: e,
      reply: c
    },
    reactions: {
      count: o
    },
    recasts: {
      count: n
    },
    channel: u,
    deletedAt: i.deletedAt
  };
  try {
    await r.set("getFarcasterCastByHash:" + t, JSON.stringify(v));
  } catch (e) {
    console.error("getFarcasterCastByHash:" + t, e);
  }
  return {
    ...v,
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
    var i = await r.get("getFarcasterCastByShortHash:" + e);
    i && (s = i.value);
  } catch (e) {
    console.error(e);
  }
  if (!s) {
    i = await Casts.findOne({
      hash: {
        $regex: "^" + e
      },
      fid: t.fid,
      deletedAt: null
    });
    if (!i) return null;
    s = i.hash;
  }
  try {
    await r.set("getFarcasterCastByShortHash:" + e, s);
  } catch (e) {
    console.error(e);
  }
  return getFarcasterCastByHash(s, a);
}, getFarcasterAllCastsInThread = async (e, t) => {
  var a = getMemcachedClient();
  let r;
  try {
    var s = await a.get("getFarcasterAllCastsInThread:" + e);
    s && (r = JSON.parse(s.value).map(e => new Casts(e)));
  } catch (e) {
    console.error(e);
  }
  if (!r) {
    r = await Casts.find({
      threadHash: e,
      deletedAt: null
    }).sort({
      timestamp: -1
    }).limit(250);
    try {
      await a.set("getFarcasterAllCastsInThread:" + e, JSON.stringify(r));
    } catch (e) {
      console.error(e);
    }
  }
  s = await Promise.all(r.map(e => getFarcasterCastByHash(e.hash, t)));
  return [ await getFarcasterCastByHash(e, t), ...s ];
}, getFarcasterCastsInThread = async ({
  threadHash: e,
  parentHash: t,
  limit: a,
  cursor: r,
  context: s
}) => {
  var i = getMemcachedClient(), [ n, l ] = r ? r.split("-") : [ null, null ];
  let c;
  try {
    var o = await i.get(`getFarcasterCastsInThread:${e}:${t}:${a}:` + r);
    o && (c = JSON.parse(o.value).map(e => new Casts(e)));
  } catch (e) {
    console.error(e);
  }
  o = {
    threadHash: e,
    deletedAt: null,
    timestamp: {
      $lt: n || Date.now()
    },
    id: {
      $lt: l || Number.MAX_SAFE_INTEGER
    }
  };
  if (t && (o.parentHash = t), !c) {
    c = await Casts.find(o).sort({
      timestamp: -1
    }).limit(a);
    try {
      await i.set(`getFarcasterCastsInThread:${e}:${t}:${a}:` + r, JSON.stringify(c));
    } catch (e) {
      console.error(e);
    }
  }
  n = await Promise.all(c.map(async e => {
    e = await getFarcasterCastByHash(e.hash, s, {
      includeReply: !0
    });
    return e ? {
      ...e,
      childrenCasts: e.replies?.reply ? [ e.replies.reply ] : []
    } : null;
  })), l = await getFarcasterCastByHash(e, s);
  let d = t;
  for (var g = []; d && d !== e; ) {
    var u = await getFarcasterCastByHash(d, s);
    if (!u) break;
    g.push(u), d = u.parentHash;
  }
  let h = null;
  c.length === a && (h = c[c.length - 1].timestamp.getTime() + "-" + c[c.length - 1].id);
  const y = new Map();
  return [ l, ...g, ...n ].forEach(e => {
    e && !y.has(e.hash) && y.set(e.hash, e);
  }), [ Array.from(y.values()), h ];
}, getFarcasterCasts = async ({
  fid: e,
  parentChain: t,
  limit: a,
  cursor: r,
  context: s,
  explore: i = !1,
  filters: n = {}
}) => {
  var [ l, c ] = r ? r.split("-") : [ null, null ], o = getMemcachedClient(), l = {
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
  }), e && (l.fid = e), t && (l.parentUrl = t, i) && (l.globalScore = {
    $gt: GLOBAL_SCORE_THRESHOLD_CHANNEL
  });
  let d;
  if (r) try {
    var g = await o.get(`getFarcasterCasts:${e}:${t}:${a}:${r}:` + i);
    g && (d = JSON.parse(g.value).map(e => new Casts(e)));
  } catch (e) {
    console.error(e);
  }
  if (!d && (d = await Casts.find(l).sort({
    timestamp: -1
  }).limit(a), r)) try {
    await o.set(`getFarcasterCasts:${e}:${t}:${a}:${r}:` + i, JSON.stringify(d));
  } catch (e) {
    console.error(e);
  }
  c = d.map(e => getFarcasterCastByHash(e.hash, s)), n = (await Promise.all(c)).filter(e => e), 
  g = n.map(e => {
    return e.parentHash ? getFarcasterCastByHash(e.parentHash, s) : e;
  });
  const u = await Promise.all(g);
  let h = null;
  return [ n.map((e, t) => e.parentHash && u[t] ? {
    ...u[t],
    childCast: e,
    childrenCasts: [ e ]
  } : e), h = d.length === a ? d[d.length - 1].timestamp.getTime() + "-" + d[d.length - 1].id : h ];
}, searchFarcasterCasts = async ({
  query: e,
  limit: t = 10,
  cursor: a = null,
  context: r = null
}) => {
  var [ s, i ] = a ? a.split("-") : [ null, null ], n = getMemcachedClient();
  let l;
  a = `searchFarcasterCasts:${e}:${t}:` + a;
  try {
    var c = await n.get(a);
    c && (l = JSON.parse(c.value).map(e => new Casts(e)));
  } catch (e) {
    console.error(e);
  }
  if (!l) {
    c = {
      timestamp: {
        $lt: s || Date.now()
      },
      id: {
        $lt: i || Number.MAX_SAFE_INTEGER
      },
      $text: {
        $search: e.replace(/["\$\-\\]/g, "\\$&")
      },
      deletedAt: null
    };
    l = await Casts.find(c).sort({
      _id: -1
    }).limit(t).exec();
    try {
      await n.set(a, JSON.stringify(l), {
        expires: 60
      });
    } catch (e) {
      console.error(e);
    }
  }
  s = l.map(e => getFarcasterCastByHash(e.hash, r));
  let o = null;
  return [ await Promise.all(s), o = l.length === t ? l[l.length - 1].timestamp.getTime() + "-" + l[l.length - 1].id : o ];
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
  var [ r, s ] = a ? a.split("-") : [ null, null ], i = getMemcachedClient();
  let n;
  if (a) try {
    var l = await i.get(`getFarcasterFollowing:${e}:${t}:` + a);
    l && (n = JSON.parse(l.value).map(e => new Links(e)));
  } catch (e) {
    console.error(e);
  }
  if (!n && (n = await Links.find({
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
    await i.set(`getFarcasterFollowing:${e}:${t}:` + a, JSON.stringify(n));
  } catch (e) {
    console.error(e);
  }
  l = n.map(e => getFarcasterUserByFid(e.targetFid));
  let c = null;
  return [ await Promise.all(l), c = n.length === t ? n[n.length - 1].timestamp.getTime() + "-" + n[n.length - 1].id : c ];
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
}, getFarcasterFollowers = async (e, t, a) => {
  var [ r, s ] = a ? a.split("-") : [ null, null ], i = getMemcachedClient();
  let n;
  if (a) try {
    var l = await i.get(`getFarcasterFollowers:${e}:${t}:` + a);
    l && (n = JSON.parse(l.value).map(e => new Links(e)));
  } catch (e) {
    console.error(e);
  }
  if (!n && (n = await Links.find({
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
    await i.set(`getFarcasterFollowers:${e}:${t}:` + a, JSON.stringify(n));
  } catch (e) {
    console.error(e);
  }
  l = n.map(e => getFarcasterUserByFid(e.fid));
  let c = null;
  return [ await Promise.all(l), c = n.length === t ? n[n.length - 1].timestamp.getTime() + "-" + n[n.length - 1].id : c ];
}, getFarcasterCastReactions = async (e, t, a) => {
  var r = getMemcachedClient(), [ s, i ] = a ? a.split("-") : [ null, null ];
  let n;
  if (a) try {
    var l = await r.get(`getFarcasterCastReactions:${e}:${t}:` + a);
    l && (n = JSON.parse(l.value).map(e => new Reactions(e)));
  } catch (e) {
    console.error(e);
  }
  if (!n && (n = await Reactions.find({
    targetHash: e,
    timestamp: {
      $lt: s || Date.now()
    },
    id: {
      $lt: i || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null
  }).sort({
    timestamp: -1
  }).limit(t), a)) try {
    await r.set(`getFarcasterCastReactions:${e}:${t}:` + a, JSON.stringify(n));
  } catch (e) {
    console.error(e);
  }
  l = n.map(e => getFarcasterUserByFid(e.fid));
  let c = null;
  return [ await Promise.all(l), c = n.length === t ? n[n.length - 1].timestamp.getTime() + "-" + n[n.length - 1].id : c ];
}, getFarcasterCastLikes = async (e, t, a) => {
  var [ r, s ] = a ? a.split("-") : [ null, null ], i = getMemcachedClient();
  let n;
  if (a) try {
    var l = await i.get(`getFarcasterCastLikes:${e}:${t}:` + a);
    l && (n = JSON.parse(l.value).map(e => new Reactions(e)));
  } catch (e) {
    console.error(e);
  }
  if (!n && (n = await Reactions.find({
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
    await i.set(`getFarcasterCastLikes:${e}:${t}:` + a, JSON.stringify(n));
  } catch (e) {
    console.error(e);
  }
  l = n.map(e => getFarcasterUserByFid(e.fid));
  let c = null;
  return [ await Promise.all(l), c = n.length === t ? n[n.length - 1].timestamp.getTime() + "-" + n[n.length - 1].id : c ];
}, getFarcasterCastRecasters = async (e, t, a) => {
  var [ r, s ] = a ? a.split("-") : [ null, null ], i = getMemcachedClient();
  let n;
  if (a) try {
    var l = await i.get(`getFarcasterCastRecasters:${e}:${t}:` + a);
    l && (n = JSON.parse(l.value).map(e => new Reactions(e)));
  } catch (e) {
    console.error(e);
  }
  if (!n && (n = await Reactions.find({
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
    await i.set(`getFarcasterCastRecasters:${e}:${t}:` + a, JSON.stringify(n));
  } catch (e) {
    console.error(e);
  }
  l = n.map(e => getFarcasterUserByFid(e.fid));
  let c = null;
  return [ await Promise.all(l), c = n.length === t ? n[n.length - 1].timestamp.getTime() + "-" + n[n.length - 1].id : c ];
}, getFarcasterFeed = async ({
  limit: e = 10,
  cursor: t = null,
  context: a = {},
  explore: r = !1
}) => {
  var s = getMemcachedClient(), [ i, n ] = t ? t.split("-") : [ null, null ], i = {
    timestamp: {
      $lt: i || Date.now()
    },
    id: {
      $lt: n || Number.MAX_SAFE_INTEGER
    },
    deletedAt: null
  };
  r && (i.globalScore = {
    $gt: GLOBAL_SCORE_THRESHOLD
  });
  let l;
  try {
    var c = await s.get(`getFarcasterFeed:${a?.fid || "global"}:${r}:${e}:` + t);
    c && (l = JSON.parse(c.value).map(e => new Casts(e)));
  } catch (e) {
    console.error(e);
  }
  if (!l) {
    l = await Casts.find(i).sort({
      timestamp: -1
    }).limit(e);
    try {
      t ? await s.set(`getFarcasterFeed:${a?.fid || "global"}:${r}:${e}:` + t, JSON.stringify(l)) : await s.set(`getFarcasterFeed:${a?.fid || "global"}:${r}:${e}:` + t, JSON.stringify(l), {
        lifetime: 60
      });
    } catch (e) {
      console.error(e);
    }
  }
  n = l.map(e => getFarcasterFeedCastByHash(e.hash, a)), c = (await Promise.all(n)).filter(e => !(!e || e.parentHash && e.threadHash === e.hash));
  const o = {};
  i = c.reduce((e, t) => (t.author?.fid && (e[t.hash] || o[t.author.fid] ? o[t.author.fid] || t.childrenCasts.length > e[t.hash].childrenCasts.length && (e[t.hash] = t, 
  o[t.author.fid] = o[t.author.fid] ? o[t.author.fid] + 1 : 1) : (e[t.hash] = t, 
  o[t.author.fid] = o[t.author.fid] ? o[t.author.fid] + 1 : 1)), e), {});
  let d = null;
  return l.length >= e && (d = l[l.length - 1].timestamp.getTime() + "-" + l[l.length - 1].id), 
  [ Object.values(i), d ];
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
  var [ a, s ] = t ? t.split("-") : [ null, null ], i = getMemcachedClient();
  let n;
  try {
    const c = await i.get(t ? `getFarcasterNotifications:${r.fid}:${e}:` + t : "getFarcasterNotifications:" + r.fid);
    c && (n = JSON.parse(c.value).map(e => new Notifications(e)));
  } catch (e) {
    console.error(e);
  }
  if (!n && (n = await Notifications.find({
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
    await i.set(t ? `getFarcasterNotifications:${r.fid}:${e}:` + t : "getFarcasterNotifications:" + r.fid, JSON.stringify(n));
  } catch (e) {
    console.error(e);
  }
  let l = null;
  n.length === e && (l = n[n.length - 1].timestamp.getTime() + "-" + n[n.length - 1].id);
  const c = await Promise.all(n.map(async e => {
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
  return [ c, l ];
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
    });
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
  let i;
  if (!i && (i = await Frames.find(a).sort({
    createdAt: -1
  }).limit(e), t)) try {
    await s.set(`getFrames:${e}:` + t, JSON.stringify(i));
  } catch (e) {
    console.error(e);
  }
  let n = null;
  return i.length === e && (n = i[i.length - 1].createdAt.getTime() + "-" + i[i.length - 1].id), 
  [ i, n ];
}, createReport = async e => {
  var t;
  if (e) return t = (await Reports.findOne({
    fid: e
  }))?.count || 0, t += 1, await Reports.updateOne({
    fid: e
  }, {
    count: t
  }, {
    upsert: !0
  });
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
  let i;
  try {
    var n = await s.get(`getActions:${e}:` + t);
    n && (i = JSON.parse(n.value).map(e => new SyncedActions(e)));
  } catch (e) {
    console.error(e);
  }
  let l = null;
  return (i = i || await SyncedActions.find(a).sort("rank _id").limit(e)).length === e && (l = i[i.length - 1].createdAt.getTime() + "-" + i[i.length - 1].id), 
  [ i, l ];
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
  getFarcasterAllCastsInThread: getFarcasterAllCastsInThread,
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
  isFollowingFid: isFollowingFid,
  getActions: getActions,
  createAction: createAction
};
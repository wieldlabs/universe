const {
  NobleEd25519Signer,
  Message,
  makeReactionAdd: makeReactionAddRpc,
  makeReactionRemove: makeReactionRemoveRpc,
  makeCastAdd: makeCastAddRpc,
  makeCastRemove: makeCastRemoveRpc,
  makeLinkAdd: makeLinkAddRpc,
  makeLinkRemove: makeLinkRemoveRpc,
  makeUserDataAdd: makeUserDataAddRpc,
  makeFrameAction: makeFrameActionRpc,
  getInsecureHubRpcClient,
  getSSLHubRpcClient,
  toFarcasterTime,
  MessageType,
  UserDataType,
  ReactionType
} = require("@farcaster/hub-nodejs"), memcache = require("../connectmemcache")["memcache"], prod = require("../helpers/registrar")["prod"], _AlchemyService = require("../services/AlchemyService")["Service"], _MarketplaceService = require("../services/MarketplaceService")["Service"], CastHandle = require("../models/CastHandle")["CastHandle"], {
  postMessage,
  getConnectedAddressForFid,
  getCustodyAddressByFid
} = require("./farcaster"), axios = require("axios"), Sentry = require("@sentry/node"), ethers = require("ethers")["ethers"], validateAndConvertAddress = require("./validate-and-convert-address")["validateAndConvertAddress"], DEFAULT_NETWORK = 1, USERNAME_PROOF_DOMAIN = {
  name: "Farcaster name verification",
  version: "1",
  chainId: 1,
  verifyingContract: "0xe3be01d99baa8db9905b33a3ca391238234b79d1"
}, USERNAME_PROOF_TYPE = {
  UserNameProof: [ {
    name: "name",
    type: "string"
  }, {
    name: "timestamp",
    type: "uint256"
  }, {
    name: "owner",
    type: "address"
  } ]
};

async function getAddressPasses(e, a) {
  if (!e || e.length < 10) throw new Error("address is invalid");
  let t = null, r = [];
  try {
    var s = "getAddressPasses:" + e, n = "getAddressPasses_isHolder:" + e, i = await memcache.get(s), d = await memcache.get(n);
    if (i ? (r = JSON.parse(i.value), t = !0) : d ? t = JSON.parse(d.value) : (t = await CastHandle.exists({
      owner: e.toLowerCase()
    }), await memcache.set(n, JSON.stringify(t), {
      lifetime: t ? 3600 : 1
    })), a) return {
      isHolder: t,
      passes: r
    };
    t && !i && 0 < (r = await getCastHandles(e))?.length && await memcache.set(s, JSON.stringify(r), {
      lifetime: 10
    });
  } catch (e) {
    throw console.error(e), new Error("Failed to retrieve address passes");
  }
  return {
    passes: r,
    isHolder: t
  };
}

async function getCastHandles(e) {
  return (await CastHandle.find({
    owner: e.toLowerCase()
  })).filter(e => e?.handle).map(e => "ETH" === e.chain ? e.handle.toLowerCase() + ".cast" : "OP" === e.chain ? e.handle.replace("op_", "").toLowerCase() + ".op.cast" : e.handle.replace("base_", "").toLowerCase() + ".base.cast");
}

async function getCastHandlesWithMetadata({
  address: e,
  limit: a = 100,
  filters: t,
  sort: r = "-fid",
  cursor: s
}) {
  const n = new _MarketplaceService();
  if (t && 0 < Object.keys(t).length) return n.getListings({
    sort: r,
    limit: a,
    cursor: s,
    filters: {
      ...t,
      collection: "castHandle",
      address: validateAndConvertAddress(e)
    }
  });
  var [ , r ] = s ? s.split("-") : [ null, null ];
  let i;
  (i = s && (t = `getCastHandlesWithMetadata:${e}:${a}:` + s, t = await memcache.get(t)) ? JSON.parse(t.value).map(e => new CastHandle(e)) : i) || (i = await CastHandle.find({
    owner: e.toLowerCase(),
    id: {
      $lt: r || Number.MAX_SAFE_INTEGER
    }
  }).sort({
    _id: -1
  }).limit(a), s && (t = `getCastHandlesWithMetadata:${e}:${a}:` + s, await memcache.set(t, JSON.stringify(i), {
    lifetime: 10
  })));
  r = i.filter(e => e?.handle);
  let d = null;
  return [ await Promise.all(r.map(async e => {
    var a = "ETH" === e.chain ? 1 : 10, [ a ] = await Promise.all([ n.getListing({
      fid: -1,
      tokenId: ethers.BigNumber.from(e.tokenId).toString(),
      chainId: a
    }) ]);
    return {
      ...e.toObject(),
      listing: a
    };
  })), d = i.length === a ? i[i.length - 1]._id + "-" + i[i.length - 1]._id : d ];
}

async function getListingDetails({
  fid: e,
  tokenId: a,
  chainId: t
}) {
  var r = new _MarketplaceService(), [ r, e, a, t ] = (a = a ? a.toString() : void 0, 
  t = t ? parseInt(t) : void 0, await Promise.all([ r.fetchUserData(e, a, t), r.fetchListing(e, a, t), r.getOffers({
    fid: e,
    tokenId: a,
    chainId: t
  }), r.getHistoricalSales({
    fid: e,
    tokenId: a,
    chainId: t
  }) ]));
  return {
    userData: r,
    listing: e,
    offers: a,
    history: t
  };
}

async function fetchAndProcessNFTs(e, a, t) {
  var [ e, a ] = await Promise.all([ e.getNFTs({
    owner: t,
    contractAddresses: [ prod().REGISTRAR_ADDRESS ]
  }), a.getNFTs({
    owner: t,
    contractAddresses: [ prod().OPTIMISM_REGISTRAR_ADDRESS ]
  }) ]);
  return (e?.ownedNfts || []).concat(a?.ownedNfts || []).map(e => {
    e = e.title ? e.title.replace(".beb", "").replace(".cast", "") + ".cast" : null;
    return e && !e.includes("no_metadata") ? e : null;
  }).filter(Boolean);
}

const frameContext = async (a, e, t) => {
  if (a.context && a.context.frameData) return t();
  if (!a.body?.trustedData && !a.body?.untrustedData) return t();
  if (!a.body.trustedData) return a.context = {
    ...a.context || {},
    frameData: a.body.untrustedData,
    untrustedData: a.body.untrustedData,
    verifiedFrameData: !1,
    isExternal: !0,
    connectedAddress: a.body?.untrustedData?.fid
  }, t();
  try {
    var r = Message.decode(Buffer.from(a.body.trustedData.messageBytes, "hex")), s = {
      ...a.context || {},
      frameData: r.data,
      untrustedData: a.body.untrustedData,
      verifiedFrameData: !0
    };
    if (ethers.utils.isAddress(a.body.untrustedData?.fid)) s.isExternal = !0, s.connectedAddress = a.body?.untrustedData?.fid; else {
      if (!r.data?.fid) throw new Error("FID is missing, no fallback external FID: " + JSON.stringify(r.data));
      var n, i = await getConnectedAddressForFid(r.data.fid);
      s.isExternal = !1, s.connectedAddress = i, !a.body.untrustedData?.isCustodyWallet && i && ethers.utils.isAddress(i) || (n = await getCustodyAddressByFid(r.data.fid), 
      s.connectedAddress = n);
    }
    a.context = s;
  } catch (e) {
    console.error(e), e?.message?.includes("FID is missing, no fallback external FID") || Sentry.captureException(e, {
      extra: {
        body: a.body,
        context: a.context
      }
    }), a.context = {
      ...a.context || {},
      frameData: a.body.untrustedData,
      untrustedData: a.body.untrustedData,
      verifiedFrameData: !1,
      isExternal: !0,
      connectedAddress: a.body?.untrustedData?.fid
    };
  } finally {
    t();
  }
};

function hexToBytes(a) {
  var t = new Uint8Array(Math.ceil(a.length / 2));
  for (let e = 0; e < t.length; e++) t[e] = parseInt(a.substr(2 * e, 2), 16);
  return t;
}

function extractAndReplaceMentions(e, s = {}) {
  let n = "";
  const i = [], d = [];
  return e.split(/(\s|\n)/).forEach((e, a) => {
    var t, r;
    e.startsWith("@") && (t = /(?<!\]\()@([a-zA-Z0-9_\-]+(\.[a-z]{2,})*)/g.exec(e)?.[1]) && t in s ? (r = Buffer.from(n).length, 
    i.push(s[t]), d.push(r), n += e.replace("@" + t, "")) : n += e;
  }), {
    text: n,
    mentions: i,
    mentionsPositions: d
  };
}

const makeMessage = async ({
  privateKey: e,
  messageType: a,
  body: t = {},
  fid: r,
  overrides: s = {}
}) => {
  if (!e) throw new Error("No private key provided");
  var n = new NobleEd25519Signer(Buffer.from(e, "hex"));
  let i;
  try {
    switch (a) {
     case MessageType.CAST_ADD:
      i = await makeCastAddRpc(t, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.CAST_REMOVE:
      var d = Date.now() - 314496e5, o = toFarcasterTime(d).value;
      i = await makeCastRemoveRpc(t, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK,
        timestamp: o
      }, n);
      break;

     case MessageType.REACTION_ADD:
      i = await makeReactionAddRpc(t, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.REACTION_REMOVE:
      i = await makeReactionRemoveRpc(t, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.LINK_ADD:
      i = await makeLinkAddRpc(t, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.LINK_REMOVE:
      i = await makeLinkRemoveRpc(t, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.USER_DATA_ADD:
      i = await makeUserDataAddRpc(t, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.FRAME_ACTION:
      i = await makeFrameActionRpc(t, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     default:
      throw new Error("Unknown message type: " + a);
    }
  } catch (e) {
    throw console.error(e), new Error("Unable to create message: " + e.message);
  }
  if (!i) throw new Error("Invalid Farcaster data");
  if (i.value) return e = i.value, Message.toJSON({
    ...e,
    data: {
      ...e.data,
      ...s
    }
  });
  throw i.error || new Error("Invalid Farcaster data");
}, makeRequest = async (e, a, t, r, s = {}, n = {}, i = {}) => {
  var d = "production" === process.env.NODE_ENV ? "https://build.far.quest" : "http://localhost:8080", e = await makeMessage({
    privateKey: e,
    messageType: a,
    body: t,
    fid: r,
    overrides: s
  });
  let o = "0x" === r?.slice(0, 2);
  o = o || Object.keys(n).some(a => "object" == typeof n[a] ? Object.keys(n[a]).some(e => "0x" === n[a][e]?.slice(0, 2)) : "0x" === n[a]?.slice?.(0, 2));
  a = i.accessToken;
  return a ? (await axios.post(d + "/farcaster/v2/message", {
    isExternal: o,
    message: e,
    bodyOverrides: n
  }, {
    headers: {
      "Content-Type": "application/json",
      authorization: a ? "Bearer " + a : "",
      "API-KEY": "far.quest-default-5477272"
    }
  })).data : (t = ("SECURE" === process.env.HUB_SECURE ? getSSLHubRpcClient : getInsecureHubRpcClient)(process.env.HUB_ADDRESS), 
  await postMessage({
    isExternal: o || r.startsWith("0x") || !1,
    externalFid: r,
    messageJSON: e,
    hubClient: t,
    errorHandler: i?.errorHandler || (e => {
      Sentry.captureException(e), console.error(e);
    }),
    bodyOverrides: n
  }));
}, makeCastAdd = async ({
  privateKey: e,
  text: a,
  mentionsFids: r = [],
  mentionsUsernames: t = [],
  embeds: s,
  parentHash: n,
  parentFid: i,
  parentUrl: d,
  fid: o,
  accessToken: c
}) => {
  a = extractAndReplaceMentions(a, t.reduce((e, a, t) => (e[a] = r[t], e), {})), 
  t = {
    ...a,
    embeds: s || []
  }, s = {}, n && (t.parentCastId = {
    hash: hexToBytes(n.slice(2)),
    fid: parseInt(i)
  }, s.parentCastId = {
    fid: i
  }), d && (t.parentUrl = d), s.mentions = t.mentions, t.mentions = t.mentions.map(e => parseInt(e)), 
  t.type = 320 < Buffer.from(a.text, "utf-8").length ? 1 : 0, n = {};
  c && (n.accessToken = c);
  try {
    return await makeRequest(e, MessageType.CAST_ADD, t, o, {}, s, n);
  } catch (e) {
    throw console.error(e), new Error(e);
  }
}, makeCastRemove = async ({
  privateKey: e,
  targetHash: a,
  fid: t
}, r = {}) => {
  a = {
    targetHash: hexToBytes(a.slice(2))
  };
  return makeRequest(e, MessageType.CAST_REMOVE, a, t, {}, {}, r);
}, makeLinkAdd = async ({
  privateKey: e,
  type: a,
  displayTimestamp: t,
  targetFid: r,
  fid: s
}) => {
  a = {
    type: a,
    displayTimestamp: t,
    targetFid: parseInt(r)
  }, t = {
    targetFid: r
  };
  return makeRequest(e, MessageType.LINK_ADD, a, s, {}, t);
}, makeUsernameDataAdd = async ({
  privateKey: e,
  value: a,
  fid: t
}) => {
  var r = {
    type: UserDataType.USERNAME,
    value: a
  };
  return makeRequest(e, MessageType.USER_DATA_ADD, r, t, {
    userDataBody: {
      value: a,
      type: UserDataType.USERNAME
    }
  });
}, makeUserDataAdd = async ({
  privateKey: e,
  type: a,
  value: t,
  fid: r
}) => {
  if (a === UserDataType.USERNAME) return makeUsernameDataAdd({
    privateKey: e,
    value: t,
    fid: r
  });
  a = {
    type: a,
    value: t
  };
  try {
    return await makeRequest(e, MessageType.USER_DATA_ADD, a, r);
  } catch (e) {
    throw new Error(e);
  }
}, makeLinkRemove = async ({
  privateKey: e,
  type: a,
  targetFid: t,
  fid: r
}) => {
  a = {
    type: a,
    targetFid: parseInt(t)
  }, t = {
    targetFid: t
  };
  return makeRequest(e, MessageType.LINK_REMOVE, a, r, {}, t);
}, makeReactionAdd = async ({
  privateKey: e,
  type: a,
  castHash: t,
  castAuthorFid: r,
  fid: s,
  accessToken: n
}) => {
  a = {
    type: a,
    targetCastId: {
      hash: hexToBytes(t.slice(2)),
      fid: parseInt(r)
    }
  }, t = {
    targetCastId: {
      fid: r
    }
  }, r = {};
  return n && (r.accessToken = n), makeRequest(e, 3, a, s, {}, t, r);
}, makeReactionRemove = async ({
  privateKey: e,
  type: a,
  castHash: t,
  castAuthorFid: r,
  fid: s
}) => {
  a = {
    type: a,
    targetCastId: {
      hash: hexToBytes(t.slice(2)),
      fid: parseInt(r)
    }
  }, t = {
    targetCastId: {
      fid: r
    }
  };
  return makeRequest(e, MessageType.REACTION_REMOVE, a, s, {}, t);
}, follow = async e => makeLinkAdd({
  type: "follow",
  ...e
}), unfollow = async e => makeLinkRemove({
  type: "follow",
  ...e
}), like = async ({
  isRemove: e,
  ...a
}) => (e ? makeReactionRemove : makeReactionAdd)({
  type: ReactionType.LIKE,
  ...a
}), recast = async ({
  isRemove: e,
  ...a
}) => (e ? makeReactionRemove : makeReactionAdd)({
  type: ReactionType.RECAST,
  ...a
});

async function getAddressInventory({
  address: e,
  limit: a = 100,
  cursor: t = null,
  filters: r,
  sort: s
}) {
  try {
    var [ n, i ] = await getCastHandlesWithMetadata({
      address: e,
      limit: a,
      cursor: t,
      filters: r,
      sort: s
    });
    return [ n, i ];
  } catch (e) {
    throw console.error("Error in getAddressInventory:", e), new Error("Failed to retrieve address inventory");
  }
}

async function registerUsername({
  fname: e,
  fid: a,
  owner: t,
  privateKey: r
}, s) {
  var n = Math.floor(Date.now() / 1e3), s = await (s || new ethers.Wallet(r))._signTypedData(USERNAME_PROOF_DOMAIN, USERNAME_PROOF_TYPE, {
    name: e,
    timestamp: ethers.BigNumber.from(n),
    owner: t
  }), r = await (await fetch("https://fnames.farcaster.xyz/transfers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: e,
      from: 0,
      to: parseInt(a),
      fid: parseInt(a),
      owner: t,
      timestamp: n,
      signature: s
    })
  })).json();
  if (r.error) throw new Error("USERNAME_TAKEN" === r.code ? "Username already taken" : r.error || "Failed to register username");
  return !0;
}

module.exports = {
  makeCastAdd: makeCastAdd,
  makeCastRemove: makeCastRemove,
  makeLinkAdd: makeLinkAdd,
  makeLinkRemove: makeLinkRemove,
  makeReactionAdd: makeReactionAdd,
  makeReactionRemove: makeReactionRemove,
  makeUserDataAdd: makeUserDataAdd,
  follow: follow,
  unfollow: unfollow,
  like: like,
  recast: recast,
  frameContext: frameContext,
  getAddressPasses: getAddressPasses,
  getAddressInventory: getAddressInventory,
  getListingDetails: getListingDetails,
  makeMessage: makeMessage,
  registerUsername: registerUsername,
  USERNAME_PROOF_DOMAIN: USERNAME_PROOF_DOMAIN,
  USERNAME_PROOF_TYPE: USERNAME_PROOF_TYPE,
  hexToBytes: hexToBytes
};
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
} = require("./farcaster"), axios = require("axios"), Sentry = require("@sentry/node"), ethers = require("ethers")["ethers"], validateAndConvertAddress = require("./validate-and-convert-address")["validateAndConvertAddress"], DEFAULT_NETWORK = 1;

async function getAddressPasses(e, t) {
  if (!e || e.length < 10) throw new Error("address is invalid");
  let a = null, s = [];
  try {
    var r = "getAddressPasses:" + e, n = "getAddressPasses_isHolder:" + e, i = await memcache.get(r), d = await memcache.get(n);
    if (i ? (s = JSON.parse(i.value), a = !0) : d ? a = JSON.parse(d.value) : (a = await CastHandle.exists({
      owner: e.toLowerCase()
    }), await memcache.set(n, JSON.stringify(a), {
      lifetime: a ? 3600 : 1
    })), t) return {
      isHolder: a,
      passes: s
    };
    a && !i && 0 < (s = await getCastHandles(e))?.length && await memcache.set(r, JSON.stringify(s), {
      lifetime: 10
    });
  } catch (e) {
    throw console.error(e), new Error("Failed to retrieve address passes");
  }
  return {
    passes: s,
    isHolder: a
  };
}

function setupAlchemyServices() {
  return {
    AlchemyService: new _AlchemyService({
      apiKey: prod().NODE_URL,
      chain: prod().NODE_NETWORK
    }),
    OptimismAlchemyService: new _AlchemyService({
      apiKey: prod().OPTIMISM_NODE_URL,
      chain: prod().OPTIMISM_NODE_NETWORK
    })
  };
}

async function checkIsHolderWithFallback(e, t, a) {
  let s = await t.isHolderOfCollection({
    wallet: a,
    contractAddress: prod().OPTIMISM_REGISTRAR_ADDRESS
  });
  return s = s || await e.isHolderOfCollection({
    wallet: a,
    contractAddress: prod().REGISTRAR_ADDRESS
  });
}

async function getCastHandles(e) {
  return (await CastHandle.find({
    owner: e.toLowerCase()
  })).filter(e => e?.handle).map(e => "ETH" === e.chain ? e.handle.toLowerCase() + ".cast" : e.handle.replace("op_", "").toLowerCase() + ".op.cast");
}

async function getCastHandlesWithMetadata({
  address: e,
  limit: t = 100,
  filters: a,
  sort: s = "-fid",
  cursor: r
}) {
  const n = new _MarketplaceService();
  if (a && 0 < Object.keys(a).length) return n.getListings({
    sort: s,
    limit: t,
    cursor: r,
    filters: {
      ...a,
      collection: "castHandle",
      address: validateAndConvertAddress(e)
    }
  });
  var [ , s ] = r ? r.split("-") : [ null, null ];
  let i;
  (i = r && (a = `getCastHandlesWithMetadata:${e}:${t}:` + r, a = await memcache.get(a)) ? JSON.parse(a.value).map(e => new CastHandle(e)) : i) || (i = await CastHandle.find({
    owner: e.toLowerCase(),
    id: {
      $lt: s || Number.MAX_SAFE_INTEGER
    }
  }).sort({
    _id: -1
  }).limit(t), r && (a = `getCastHandlesWithMetadata:${e}:${t}:` + r, await memcache.set(a, JSON.stringify(i), {
    lifetime: 60
  })));
  s = i.filter(e => e?.handle);
  let d = null;
  return [ await Promise.all(s.map(async e => {
    var t = "ETH" === e.chain ? 1 : 10, [ t ] = await Promise.all([ n.getListing({
      fid: -1,
      tokenId: ethers.BigNumber.from(e.tokenId).toString(),
      chainId: t
    }) ]);
    return {
      ...e.toObject(),
      listing: t
    };
  })), d = i.length === t ? i[i.length - 1]._id + "-" + i[i.length - 1]._id : d ];
}

async function getListingDetails({
  fid: e,
  tokenId: t,
  chainId: a
}) {
  var s = new _MarketplaceService(), [ s, e, t, a ] = (t = t ? t.toString() : void 0, 
  a = a ? parseInt(a) : void 0, await Promise.all([ s.fetchUserData(e, t, a), s.fetchListing(e, t, a), s.getOffers({
    fid: e,
    tokenId: t,
    chainId: a
  }), s.getHistoricalSales({
    fid: e,
    tokenId: t,
    chainId: a
  }) ]));
  return {
    userData: s,
    listing: e,
    offers: t,
    history: a
  };
}

async function fetchAndProcessNFTs(e, t, a) {
  var [ e, t ] = await Promise.all([ e.getNFTs({
    owner: a,
    contractAddresses: [ prod().REGISTRAR_ADDRESS ]
  }), t.getNFTs({
    owner: a,
    contractAddresses: [ prod().OPTIMISM_REGISTRAR_ADDRESS ]
  }) ]);
  return (e?.ownedNfts || []).concat(t?.ownedNfts || []).map(e => {
    e = e.title ? e.title.replace(".beb", "").replace(".cast", "") + ".cast" : null;
    return e && !e.includes("no_metadata") ? e : null;
  }).filter(Boolean);
}

const frameContext = async (t, e, a) => {
  if (t.context && t.context.frameData) return a();
  if (!t.body?.trustedData && !t.body?.untrustedData) return a();
  if (!t.body.trustedData) return t.context = {
    ...t.context || {},
    frameData: t.body.untrustedData,
    untrustedData: t.body.untrustedData,
    verifiedFrameData: !1,
    isExternal: !0,
    connectedAddress: t.body?.untrustedData?.fid
  }, a();
  try {
    var s = Message.decode(Buffer.from(t.body.trustedData.messageBytes, "hex")), r = {
      ...t.context || {},
      frameData: s.data,
      untrustedData: t.body.untrustedData,
      verifiedFrameData: !0
    };
    if (ethers.utils.isAddress(t.body.untrustedData?.fid)) r.isExternal = !0, r.connectedAddress = t.body?.untrustedData?.fid; else {
      if (!s.data?.fid) throw new Error("FID is missing, no fallback external FID: " + JSON.stringify(s.data));
      var n, i = await getConnectedAddressForFid(s.data.fid);
      r.isExternal = !1, r.connectedAddress = i, !t.body.untrustedData?.isCustodyWallet && i && ethers.utils.isAddress(i) || (n = await getCustodyAddressByFid(s.data.fid), 
      r.connectedAddress = n);
    }
    t.context = r;
  } catch (e) {
    console.error(e), e?.message?.includes("FID is missing, no fallback external FID") || Sentry.captureException(e, {
      extra: {
        body: t.body,
        context: t.context
      }
    }), t.context = {
      ...t.context || {},
      frameData: t.body.untrustedData,
      untrustedData: t.body.untrustedData,
      verifiedFrameData: !1,
      isExternal: !0,
      connectedAddress: t.body?.untrustedData?.fid
    };
  } finally {
    a();
  }
};

function hexToBytes(t) {
  var a = new Uint8Array(Math.ceil(t.length / 2));
  for (let e = 0; e < a.length; e++) a[e] = parseInt(t.substr(2 * e, 2), 16);
  return a;
}

function extractAndReplaceMentions(e, r = {}) {
  let n = "";
  const i = [], d = [];
  return e.split(/(\s|\n)/).forEach((e, t) => {
    var a, s;
    e.startsWith("@") && (a = /(?<!\]\()@([a-zA-Z0-9_\-]+(\.[a-z]{2,})*)/g.exec(e)?.[1]) && a in r ? (s = Buffer.from(n).length, 
    i.push(r[a]), d.push(s), n += e.replace("@" + a, "")) : n += e;
  }), {
    text: n,
    mentions: i,
    mentionsPositions: d
  };
}

const makeMessage = async ({
  privateKey: e,
  messageType: t,
  body: a = {},
  fid: s,
  overrides: r = {}
}) => {
  if (!e) throw new Error("No private key provided");
  var n = new NobleEd25519Signer(Buffer.from(e, "hex"));
  let i;
  try {
    switch (t) {
     case MessageType.CAST_ADD:
      i = await makeCastAddRpc(a, {
        fid: parseInt(s),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.CAST_REMOVE:
      var d = Date.now() - 314496e5, o = toFarcasterTime(d).value;
      i = await makeCastRemoveRpc(a, {
        fid: parseInt(s),
        network: DEFAULT_NETWORK,
        timestamp: o
      }, n);
      break;

     case MessageType.REACTION_ADD:
      i = await makeReactionAddRpc(a, {
        fid: parseInt(s),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.REACTION_REMOVE:
      i = await makeReactionRemoveRpc(a, {
        fid: parseInt(s),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.LINK_ADD:
      i = await makeLinkAddRpc(a, {
        fid: parseInt(s),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.LINK_REMOVE:
      i = await makeLinkRemoveRpc(a, {
        fid: parseInt(s),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.USER_DATA_ADD:
      i = await makeUserDataAddRpc(a, {
        fid: parseInt(s),
        network: DEFAULT_NETWORK
      }, n);
      break;

     default:
      throw new Error("Unknown message type: " + t);
    }
  } catch (e) {
    throw console.error(e), new Error("Unable to create message: " + e.message);
  }
  if (!i) throw new Error("Invalid Farcaster data");
  if (i.value) return e = i.value, Message.toJSON({
    ...e,
    data: {
      ...e.data,
      ...r
    }
  });
  throw i.error || new Error("Invalid Farcaster data");
}, makeRequest = async (e, t, a, s, r = {}, n = {}, i = {}) => {
  var d = "production" === process.env.NODE_ENV ? "https://build.far.quest" : "http://localhost:8080", e = await makeMessage({
    privateKey: e,
    messageType: t,
    body: a,
    fid: s,
    overrides: r
  });
  let o = "0x" === s?.slice(0, 2);
  o = o || Object.keys(n).some(t => "object" == typeof n[t] ? Object.keys(n[t]).some(e => "0x" === n[t][e]?.slice(0, 2)) : "0x" === n[t]?.slice?.(0, 2));
  t = i.accessToken;
  return t ? (await axios.post(d + "/farcaster/v2/message", {
    isExternal: o,
    message: e,
    bodyOverrides: n
  }, {
    headers: {
      "Content-Type": "application/json",
      authorization: t ? "Bearer " + t : "",
      "API-KEY": "far.quest-default-5477272"
    }
  })).data : (a = ("SECURE" === process.env.HUB_SECURE ? getSSLHubRpcClient : getInsecureHubRpcClient)(process.env.HUB_ADDRESS), 
  await postMessage({
    isExternal: o || s.startsWith("0x") || !1,
    externalFid: s,
    messageJSON: e,
    hubClient: a,
    errorHandler: i?.errorHandler || (e => {
      Sentry.captureException(e), console.error(e);
    }),
    bodyOverrides: n
  }));
}, makeCastAdd = async ({
  privateKey: e,
  text: t,
  mentionsFids: s = [],
  mentionsUsernames: a = [],
  embeds: r,
  parentHash: n,
  parentFid: i,
  parentUrl: d,
  fid: o,
  accessToken: c
}) => {
  a = {
    ...extractAndReplaceMentions(t, a.reduce((e, t, a) => (e[t] = s[a], e), {})),
    embeds: r || []
  }, r = {}, n && (a.parentCastId = {
    hash: hexToBytes(n.slice(2)),
    fid: parseInt(i)
  }, r.parentCastId = {
    fid: i
  }), d && (a.parentUrl = d), r.mentions = a.mentions, a.mentions = a.mentions.map(e => parseInt(e)), 
  a.type = 320 < Buffer.from(t, "utf-8").length ? 1 : 0, n = {};
  c && (n.accessToken = c);
  try {
    return await makeRequest(e, MessageType.CAST_ADD, a, o, {}, r, n);
  } catch (e) {
    throw console.error(e), new Error(e);
  }
}, makeCastRemove = async ({
  privateKey: e,
  targetHash: t,
  fid: a
}, s = {}) => {
  t = {
    targetHash: hexToBytes(t.slice(2))
  };
  return makeRequest(e, MessageType.CAST_REMOVE, t, a, {}, {}, s);
}, makeLinkAdd = async ({
  privateKey: e,
  type: t,
  displayTimestamp: a,
  targetFid: s,
  fid: r
}) => {
  t = {
    type: t,
    displayTimestamp: a,
    targetFid: parseInt(s)
  }, a = {
    targetFid: s
  };
  return makeRequest(e, MessageType.LINK_ADD, t, r, {}, a);
}, makeUsernameDataAdd = async ({
  privateKey: e,
  value: t,
  fid: a
}) => {
  var s = {
    type: UserDataType.USERNAME,
    value: a?.slice(0, 15)
  };
  return makeRequest(e, MessageType.USER_DATA_ADD, s, a, {
    userDataBody: {
      value: t,
      type: UserDataType.USERNAME
    }
  });
}, makeUserDataAdd = async ({
  privateKey: e,
  type: t,
  value: a,
  fid: s
}) => {
  if (t === UserDataType.USERNAME) return makeUsernameDataAdd({
    value: a,
    fid: s
  });
  t = {
    type: t,
    value: a
  };
  try {
    return await makeRequest(e, MessageType.USER_DATA_ADD, t, s);
  } catch (e) {
    throw new Error(e);
  }
}, makeLinkRemove = async ({
  privateKey: e,
  type: t,
  targetFid: a,
  fid: s
}) => {
  t = {
    type: t,
    targetFid: parseInt(a)
  }, a = {
    targetFid: a
  };
  return makeRequest(e, MessageType.LINK_REMOVE, t, s, {}, a);
}, makeReactionAdd = async ({
  privateKey: e,
  type: t,
  castHash: a,
  castAuthorFid: s,
  fid: r,
  accessToken: n
}) => {
  t = {
    type: t,
    targetCastId: {
      hash: hexToBytes(a.slice(2)),
      fid: parseInt(s)
    }
  }, a = {
    targetCastId: {
      fid: s
    }
  }, s = {};
  return n && (s.accessToken = n), makeRequest(e, 3, t, r, {}, a, s);
}, makeReactionRemove = async ({
  privateKey: e,
  type: t,
  castHash: a,
  castAuthorFid: s,
  fid: r
}) => {
  t = {
    type: t,
    targetCastId: {
      hash: hexToBytes(a.slice(2)),
      fid: parseInt(s)
    }
  }, a = {
    targetCastId: {
      fid: s
    }
  };
  return makeRequest(e, MessageType.REACTION_REMOVE, t, r, {}, a);
}, follow = async e => makeLinkAdd({
  type: "follow",
  ...e
}), unfollow = async e => makeLinkRemove({
  type: "follow",
  ...e
}), like = async ({
  isRemove: e,
  ...t
}) => (e ? makeReactionRemove : makeReactionAdd)({
  type: ReactionType.LIKE,
  ...t
}), recast = async ({
  isRemove: e,
  ...t
}) => (e ? makeReactionRemove : makeReactionAdd)({
  type: ReactionType.RECAST,
  ...t
});

async function getAddressInventory({
  address: e,
  limit: t = 100,
  cursor: a = null,
  filters: s,
  sort: r
}) {
  try {
    var [ n, i ] = await getCastHandlesWithMetadata({
      address: e,
      limit: t,
      cursor: a,
      filters: s,
      sort: r
    });
    return [ n, i ];
  } catch (e) {
    throw console.error("Error in getAddressInventory:", e), new Error("Failed to retrieve address inventory");
  }
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
  getListingDetails: getListingDetails
};
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
} = require("./farcaster"), Sentry = require("@sentry/node"), ethers = require("ethers")["ethers"], validateAndConvertAddress = require("./validate-and-convert-address")["validateAndConvertAddress"], DEFAULT_NETWORK = 1;

async function getAddressPasses(e, t) {
  if (!e || e.length < 10) throw new Error("address is invalid");
  let a = null, r = [];
  try {
    var s = "getAddressPasses:" + e, n = "getAddressPasses_isHolder:" + e, i = await memcache.get(s), d = await memcache.get(n);
    if (i ? (r = JSON.parse(i.value), a = !0) : d ? a = JSON.parse(d.value) : (a = await CastHandle.exists({
      owner: e.toLowerCase()
    }), await memcache.set(n, JSON.stringify(a), {
      lifetime: a ? 3600 : 1
    })), t) return {
      isHolder: a,
      passes: r
    };
    a && !i && 0 < (r = await getCastHandles(e))?.length && await memcache.set(s, JSON.stringify(r), {
      lifetime: 10
    });
  } catch (e) {
    throw console.error(e), new Error("Failed to retrieve address passes");
  }
  return {
    passes: r,
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
  let r = await t.isHolderOfCollection({
    wallet: a,
    contractAddress: prod().OPTIMISM_REGISTRAR_ADDRESS
  });
  return r = r || await e.isHolderOfCollection({
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
  sort: r = "-fid",
  cursor: s
}) {
  const n = new _MarketplaceService();
  if (a && 0 < Object.keys(a).length) return n.getListings({
    sort: r,
    limit: t,
    cursor: s,
    filters: {
      ...a,
      collection: "castHandle",
      address: validateAndConvertAddress(e)
    }
  });
  var [ , r ] = s ? s.split("-") : [ null, null ];
  let i;
  (i = s && (a = `getCastHandlesWithMetadata:${e}:${t}:` + s, a = await memcache.get(a)) ? JSON.parse(a.value).map(e => new CastHandle(e)) : i) || (i = await CastHandle.find({
    owner: e.toLowerCase(),
    id: {
      $lt: r || Number.MAX_SAFE_INTEGER
    }
  }).sort({
    _id: -1
  }).limit(t), s && (a = `getCastHandlesWithMetadata:${e}:${t}:` + s, await memcache.set(a, JSON.stringify(i), {
    lifetime: 60
  })));
  r = i.filter(e => e?.handle);
  let d = null;
  return [ await Promise.all(r.map(async e => {
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
  var r = new _MarketplaceService(), [ r, e, t, a ] = (t = t ? t.toString() : void 0, 
  a = a ? parseInt(a) : void 0, await Promise.all([ r.fetchUserData(e, t, a), r.fetchListing(e, t, a), r.getOffers({
    fid: e,
    tokenId: t,
    chainId: a
  }), r.getHistoricalSales({
    fid: e,
    tokenId: t,
    chainId: a
  }) ]));
  return {
    userData: r,
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
    var r = Message.decode(Buffer.from(t.body.trustedData.messageBytes, "hex")), s = {
      ...t.context || {},
      frameData: r.data,
      untrustedData: t.body.untrustedData,
      verifiedFrameData: !0
    };
    if (ethers.utils.isAddress(t.body.untrustedData?.fid)) s.isExternal = !0, s.connectedAddress = t.body?.untrustedData?.fid; else {
      if (!r.data?.fid) throw new Error("FID is missing, no fallback external FID: " + JSON.stringify(r.data));
      var n, i = await getConnectedAddressForFid(r.data.fid);
      s.isExternal = !1, s.connectedAddress = i, !t.body.untrustedData?.isCustodyWallet && i && ethers.utils.isAddress(i) || (n = await getCustodyAddressByFid(r.data.fid), 
      s.connectedAddress = n);
    }
    t.context = s;
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

function extractAndReplaceMentions(e, s = {}) {
  let n = "";
  const i = [], d = [];
  return e.split(/(\s|\n)/).forEach((e, t) => {
    var a, r;
    e.startsWith("@") && (a = /(?<!\]\()@([a-zA-Z0-9_\-]+(\.[a-z]{2,})*)/g.exec(e)?.[1]) && a in s ? (r = Buffer.from(n).length, 
    i.push(s[a]), d.push(r), n += e.replace("@" + a, "")) : n += e;
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
  fid: r,
  overrides: s = {}
}) => {
  if (!e) throw new Error("No private key provided");
  var n = new NobleEd25519Signer(Buffer.from(e, "hex"));
  let i;
  try {
    switch (t) {
     case MessageType.CAST_ADD:
      i = await makeCastAddRpc(a, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.CAST_REMOVE:
      var d = Date.now() - 314496e5, o = toFarcasterTime(d).value;
      i = await makeCastRemoveRpc(a, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK,
        timestamp: o
      }, n);
      break;

     case MessageType.REACTION_ADD:
      i = await makeReactionAddRpc(a, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.REACTION_REMOVE:
      i = await makeReactionRemoveRpc(a, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.LINK_ADD:
      i = await makeLinkAddRpc(a, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.LINK_REMOVE:
      i = await makeLinkRemoveRpc(a, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.USER_DATA_ADD:
      i = await makeUserDataAddRpc(a, {
        fid: parseInt(r),
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
      ...s
    }
  });
  throw i.error || new Error("Invalid Farcaster data");
}, makeRequest = async (e, t, a, r, s = {}, n = {}, i = {}) => {
  e = await makeMessage({
    privateKey: e,
    messageType: t,
    body: a,
    fid: r,
    overrides: s
  });
  let d = "0x" === r?.slice(0, 2);
  t = ("SECURE" === process.env.HUB_SECURE ? getSSLHubRpcClient : getInsecureHubRpcClient)(process.env.HUB_ADDRESS), 
  d = d || Object.keys(n).some(t => "object" == typeof n[t] ? Object.keys(n[t]).some(e => "0x" === n[t][e]?.slice(0, 2)) : "0x" === n[t]?.slice?.(0, 2)), 
  a = await postMessage({
    isExternal: d || r.startsWith("0x") || !1,
    externalFid: r,
    messageJSON: e,
    hubClient: t,
    errorHandler: i?.errorHandler || (e => {
      Sentry.captureException(e), console.error(e);
    }),
    bodyOverrides: n
  });
  return a;
}, makeCastAdd = async ({
  privateKey: e,
  text: t,
  mentionsFids: r = [],
  mentionsUsernames: a = [],
  embeds: s,
  parentHash: n,
  parentFid: i,
  parentUrl: d,
  fid: o
}) => {
  a = {
    ...extractAndReplaceMentions(t, a.reduce((e, t, a) => (e[t] = r[a], e), {})),
    embeds: s || []
  }, s = {};
  n && (a.parentCastId = {
    hash: hexToBytes(n.slice(2)),
    fid: parseInt(i)
  }, s.parentCastId = {
    fid: i
  }), d && (a.parentUrl = d), s.mentions = a.mentions, a.mentions = a.mentions.map(e => parseInt(e)), 
  a.type = 320 < Buffer.from(t, "utf-8").length ? 1 : 0;
  try {
    return await makeRequest(e, MessageType.CAST_ADD, a, o, {}, s);
  } catch (e) {
    throw console.error(e), new Error(e);
  }
}, makeCastRemove = async ({
  privateKey: e,
  targetHash: t,
  fid: a
}, r = {}) => {
  t = {
    targetHash: hexToBytes(t.slice(2))
  };
  return makeRequest(e, MessageType.CAST_REMOVE, t, a, {}, {}, r);
}, makeLinkAdd = async ({
  privateKey: e,
  type: t,
  displayTimestamp: a,
  targetFid: r,
  fid: s
}) => {
  t = {
    type: t,
    displayTimestamp: a,
    targetFid: parseInt(r)
  }, a = {
    targetFid: r
  };
  return makeRequest(e, MessageType.LINK_ADD, t, s, {}, a);
}, makeUsernameDataAdd = async ({
  privateKey: e,
  value: t,
  fid: a
}) => {
  var r = {
    type: UserDataType.USERNAME,
    value: a?.slice(0, 15)
  };
  return makeRequest(e, MessageType.USER_DATA_ADD, r, a, {
    userDataBody: {
      value: t,
      type: UserDataType.USERNAME
    }
  });
}, makeUserDataAdd = async ({
  privateKey: e,
  type: t,
  value: a,
  fid: r
}) => {
  if (t === UserDataType.USERNAME) return makeUsernameDataAdd({
    value: a,
    fid: r
  });
  t = {
    type: t,
    value: a
  };
  try {
    return await makeRequest(e, MessageType.USER_DATA_ADD, t, r);
  } catch (e) {
    throw new Error(e);
  }
}, makeLinkRemove = async ({
  privateKey: e,
  type: t,
  targetFid: a,
  fid: r
}) => {
  t = {
    type: t,
    targetFid: parseInt(a)
  }, a = {
    targetFid: a
  };
  return makeRequest(e, MessageType.LINK_REMOVE, t, r, {}, a);
}, makeReactionAdd = async ({
  privateKey: e,
  type: t,
  castHash: a,
  castAuthorFid: r,
  fid: s
}) => {
  t = {
    type: t,
    targetCastId: {
      hash: hexToBytes(a.slice(2)),
      fid: parseInt(r)
    }
  }, a = {
    targetCastId: {
      fid: r
    }
  };
  return makeRequest(e, 3, t, s, {}, a);
}, makeReactionRemove = async ({
  privateKey: e,
  type: t,
  castHash: a,
  castAuthorFid: r,
  fid: s
}) => {
  t = {
    type: t,
    targetCastId: {
      hash: hexToBytes(a.slice(2)),
      fid: parseInt(r)
    }
  }, a = {
    targetCastId: {
      fid: r
    }
  };
  return makeRequest(e, MessageType.REACTION_REMOVE, t, s, {}, a);
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
  filters: r,
  sort: s
}) {
  try {
    var [ n, i ] = await getCastHandlesWithMetadata({
      address: e,
      limit: t,
      cursor: a,
      filters: r,
      sort: s
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
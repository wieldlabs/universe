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
} = require("@farcaster/hub-nodejs"), getMemcachedClient = require("../connectmemcached")["getMemcachedClient"], prod = require("../helpers/registrar")["prod"], _AlchemyService = require("../services/AlchemyService")["Service"], {
  postMessage,
  getConnectedAddressForFid,
  getCustodyAddressByFid
} = require("./farcaster"), Sentry = require("@sentry/node"), ethers = require("ethers")["ethers"], DEFAULT_NETWORK = 1;

async function getAddressPasses(e, a) {
  if (!e || e.length < 10) throw new Error("address is invalid");
  var t = getMemcachedClient();
  let r = null, s = [];
  try {
    var n = "getAddressPasses:" + e, d = "getAddressPasses_isHolder:" + e, i = await t.get(n), o = await t.get(d), {
      AlchemyService: c,
      OptimismAlchemyService: m
    } = setupAlchemyServices();
    if (i ? (s = JSON.parse(i.value), r = !0) : o ? r = JSON.parse(o.value) : (r = await checkIsHolderWithFallback(c, m, e), 
    await t.set(d, JSON.stringify(r), {
      lifetime: r ? 86400 : 10
    })), a) return {
      isHolder: r
    };
    r && !i && (s = await fetchAndProcessNFTs(c, m, e), await t.set(n, JSON.stringify(s), {
      lifetime: 60
    }));
  } catch (e) {
    throw console.error(e), new Error("Failed to retrieve address passes");
  }
  return {
    passes: s,
    isHolder: r
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

async function checkIsHolderWithFallback(e, a, t) {
  let r = await a.isHolderOfCollection({
    wallet: t,
    contractAddress: prod().OPTIMISM_REGISTRAR_ADDRESS
  });
  return r = r || await e.isHolderOfCollection({
    wallet: t,
    contractAddress: prod().REGISTRAR_ADDRESS
  });
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
    var r, s, n = Message.decode(Buffer.from(a.body.trustedData.messageBytes, "hex")), d = {
      ...a.context || {},
      frameData: n.data,
      untrustedData: a.body.untrustedData,
      verifiedFrameData: !0
    };
    ethers.utils.isAddress(a.body.untrustedData?.fid) ? (r = await getConnectedAddressForFid(n.data.fid), 
    d.isExternal = !1, (d.connectedAddress = r) || (s = await getCustodyAddressByFid(n.data.fid), 
    d.connectedAddress = s)) : (d.isExternal = !0, d.connectedAddress = a.body?.untrustedData?.fid), 
    a.context = d;
  } catch (e) {
    console.error(e), Sentry.captureException(e), a.context = {
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
  const d = [], i = [];
  return e.split(/(\s|\n)/).forEach((e, a) => {
    var t, r;
    e.startsWith("@") && (t = /(?<!\]\()@([a-zA-Z0-9_\-]+(\.[a-z]{2,})*)/g.exec(e)[1]) in s ? (r = Buffer.from(n).length, 
    d.push(s[t]), i.push(r), n += e.replace("@" + t, "")) : n += e;
  }), {
    text: n,
    mentions: d,
    mentionsPositions: i
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
  let d;
  try {
    switch (a) {
     case MessageType.CAST_ADD:
      d = await makeCastAddRpc(t, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.CAST_REMOVE:
      var i = Date.now() - 314496e5, o = toFarcasterTime(i).value;
      d = await makeCastRemoveRpc(t, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK,
        timestamp: o
      }, n);
      break;

     case MessageType.REACTION_ADD:
      d = await makeReactionAddRpc(t, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.REACTION_REMOVE:
      d = await makeReactionRemoveRpc(t, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.LINK_ADD:
      d = await makeLinkAddRpc(t, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.LINK_REMOVE:
      d = await makeLinkRemoveRpc(t, {
        fid: parseInt(r),
        network: DEFAULT_NETWORK
      }, n);
      break;

     case MessageType.USER_DATA_ADD:
      d = await makeUserDataAddRpc(t, {
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
  if (!d) throw new Error("Invalid Farcaster data");
  if (d.value) return e = d.value, Message.toJSON({
    ...e,
    data: {
      ...e.data,
      ...s
    }
  });
  throw d.error || new Error("Invalid Farcaster data");
}, makeRequest = async (e, a, t, r, s = {}, n = {}, d = {}) => {
  e = await makeMessage({
    privateKey: e,
    messageType: a,
    body: t,
    fid: r,
    overrides: s
  });
  let i = "0x" === r?.slice(0, 2);
  a = ("SECURE" === process.env.HUB_SECURE ? getSSLHubRpcClient : getInsecureHubRpcClient)(process.env.HUB_ADDRESS), 
  i = i || Object.keys(n).some(a => "object" == typeof n[a] ? Object.keys(n[a]).some(e => "0x" === n[a][e]?.slice(0, 2)) : "0x" === n[a]?.slice?.(0, 2)), 
  t = await postMessage({
    isExternal: i || r.startsWith("0x") || !1,
    externalFid: r,
    messageJSON: e,
    hubClient: a,
    errorHandler: d?.errorHandler || (e => {
      Sentry.captureException(e), console.error(e);
    }),
    bodyOverrides: n
  });
  return t;
}, makeCastAdd = async ({
  privateKey: e,
  text: a,
  mentionsFids: r = [],
  mentionsUsernames: t = [],
  embeds: s,
  parentHash: n,
  parentFid: d,
  parentUrl: i,
  fid: o
}) => {
  a = {
    ...extractAndReplaceMentions(a, t.reduce((e, a, t) => (e[a] = r[t], e), {})),
    embeds: s || []
  }, t = {};
  n && (a.parentCastId = {
    hash: hexToBytes(n.slice(2)),
    fid: parseInt(d)
  }, t.parentCastId = {
    fid: d
  }), i && (a.parentUrl = i), t.mentions = a.mentions, a.mentions = a.mentions.map(e => parseInt(e));
  try {
    return await makeRequest(e, MessageType.CAST_ADD, a, o, {}, t);
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
    value: t?.slice(0, 15)
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
  return makeRequest(e, 3, a, s, {}, t);
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
  getAddressPasses: getAddressPasses
};
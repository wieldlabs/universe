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
  getSSLHubRpcClient
} = require("@farcaster/hub-nodejs"), getMemcachedClient = require("../connectmemcached")["getMemcachedClient"], prod = require("../helpers/registrar")["prod"], _AlchemyService = require("../services/AlchemyService")["Service"], {
  postMessage,
  getConnectedAddressForFid,
  getCustodyAddressByFid
} = require("./farcaster"), Sentry = require("@sentry/node");

async function getAddressPasses(e, t) {
  if (!e || e.length < 10) throw new Error("address is invalid");
  var a = getMemcachedClient();
  let r = null, s = [];
  try {
    var n = "getAddressPasses:" + e, d = "getAddressPasses_isHolder:" + e, i = await a.get(n), o = await a.get(d), {
      AlchemyService: c,
      OptimismAlchemyService: m
    } = setupAlchemyServices();
    if (i ? (s = JSON.parse(i.value), r = !0) : o ? r = JSON.parse(o.value) : (r = await checkIsHolderWithFallback(c, m, e), 
    await a.set(d, JSON.stringify(r), {
      lifetime: r ? 86400 : 10
    })), t) return {
      isHolder: r
    };
    r && !i && (s = await fetchAndProcessNFTs(c, m, e), await a.set(n, JSON.stringify(s), {
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
    var r, s, n = Message.decode(Buffer.from(t.body.trustedData.messageBytes, "hex")), d = {
      ...t.context || {},
      frameData: n.data,
      untrustedData: t.body.untrustedData,
      verifiedFrameData: !0
    };
    0 !== n?.data?.fid ? (r = await getConnectedAddressForFid(n.data.fid), d.isExternal = !1, 
    (d.connectedAddress = r) || (s = await getCustodyAddressByFid(n.data.fid), d.connectedAddress = s)) : (d.isExternal = !0, 
    d.connectedAddress = t.body?.untrustedData?.fid), t.context = d;
  } catch (e) {
    console.error(e), Sentry.captureException(e), t.context = {
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
  const d = [], i = [];
  return e.split(/(\s|\n)/).forEach((e, t) => {
    var a, r;
    e.startsWith("@") && (a = /(?<!\]\()@([a-zA-Z0-9_\-]+(\.[a-z]{2,})*)/g.exec(e)[1]) in s ? (r = Buffer.from(n).length, 
    d.push(s[a]), i.push(r), n += e.replace("@" + a, "")) : n += e;
  }), {
    text: n,
    mentions: d,
    mentionsPositions: i
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
  let d;
  try {
    switch (t) {
     case 1:
      d = await makeCastAddRpc(a, {
        fid: parseInt(r),
        network: 1
      }, n);
      break;

     case 2:
      d = await makeCastRemoveRpc(a, {
        fid: parseInt(r),
        network: 1
      }, n);
      break;

     case 3:
      d = await makeReactionAddRpc(a, {
        fid: parseInt(r),
        network: 1
      }, n);
      break;

     case 4:
      d = await makeReactionRemoveRpc(a, {
        fid: parseInt(r),
        network: 1
      }, n);
      break;

     case 5:
      d = await makeLinkAddRpc(a, {
        fid: parseInt(r),
        network: 1
      }, n);
      break;

     case 6:
      d = await makeLinkRemoveRpc(a, {
        fid: parseInt(r),
        network: 1
      }, n);
      break;

     case 11:
      d = await makeUserDataAddRpc(a, {
        fid: parseInt(r),
        network: 1
      }, n);
      break;

     default:
      throw new Error("Invalid message type");
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
}, makeRequest = async (e, t, a, r, s = {}, n = {}) => {
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
    errorHandler: e => {
      Sentry.captureException(e), console.error(e);
    },
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
  parentFid: d,
  parentUrl: i,
  fid: o
}) => {
  t = {
    ...extractAndReplaceMentions(t, a.reduce((e, t, a) => (e[t] = r[a], e), {})),
    embeds: s || []
  }, a = {};
  n && (t.parentCastId = {
    hash: hexToBytes(n.slice(2)),
    fid: parseInt(d)
  }, a.parentCastId = {
    fid: d
  }), i && (t.parentUrl = i), a.mentions = t.mentions, t.mentions = t.mentions.map(e => parseInt(e));
  try {
    return await makeRequest(e, 1, t, o, {}, a);
  } catch (e) {
    throw console.error(e), new Error(e);
  }
}, makeCastRemove = async ({
  privateKey: e,
  targetHash: t,
  fid: a
}) => {
  t = {
    targetHash: hexToBytes(t.slice(2))
  };
  return makeRequest(e, 2, t, a);
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
  return makeRequest(e, 5, t, s, {}, a);
}, makeUsernameDataAdd = async ({
  privateKey: e,
  value: t,
  fid: a
}) => {
  var r = {
    type: 6,
    value: a?.slice(0, 15)
  };
  return makeRequest(e, 11, r, a, {
    userDataBody: {
      value: t,
      type: 6
    }
  });
}, makeUserDataAdd = async ({
  privateKey: e,
  type: t,
  value: a,
  fid: r
}) => {
  if (6 === t) return makeUsernameDataAdd({
    value: a,
    fid: r
  });
  t = {
    type: t,
    value: a
  };
  try {
    return await makeRequest(e, 11, t, r);
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
  return makeRequest(e, 6, t, r, {}, a);
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
  return makeRequest(e, 4, t, s, {}, a);
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
  type: 1,
  ...t
}), recast = async ({
  isRemove: e,
  ...t
}) => (e ? makeReactionRemove : makeReactionAdd)({
  type: 2,
  ...t
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
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
} = require("@farcaster/hub-nodejs"), postMessage = require("./farcaster")["postMessage"], Sentry = require("@sentry/node");

function hexToBytes(a) {
  var t = new Uint8Array(Math.ceil(a.length / 2));
  for (let e = 0; e < t.length; e++) t[e] = parseInt(a.substr(2 * e, 2), 16);
  return t;
}

function extractAndReplaceMentions(e, s = {}) {
  let n = "";
  const i = [], o = [];
  return e.split(/(\s|\n)/).forEach((e, a) => {
    var t, r;
    e.startsWith("@") && (t = /(?<!\]\()@([a-zA-Z0-9_\-]+(\.[a-z]{2,})*)/g.exec(e)[1]) in s ? (r = Buffer.from(n).length, 
    i.push(s[t]), o.push(r), n += e.replace("@" + t, "")) : n += e;
  }), {
    text: n,
    mentions: i,
    mentionsPositions: o
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
     case 1:
      i = await makeCastAddRpc(t, {
        fid: parseInt(r),
        network: 1
      }, n);
      break;

     case 2:
      i = await makeCastRemoveRpc(t, {
        fid: parseInt(r),
        network: 1
      }, n);
      break;

     case 3:
      i = await makeReactionAddRpc(t, {
        fid: parseInt(r),
        network: 1
      }, n);
      break;

     case 4:
      i = await makeReactionRemoveRpc(t, {
        fid: parseInt(r),
        network: 1
      }, n);
      break;

     case 5:
      i = await makeLinkAddRpc(t, {
        fid: parseInt(r),
        network: 1
      }, n);
      break;

     case 6:
      i = await makeLinkRemoveRpc(t, {
        fid: parseInt(r),
        network: 1
      }, n);
      break;

     case 11:
      i = await makeUserDataAddRpc(t, {
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
  if (!i) throw new Error("Invalid Farcaster data");
  if (i.value) return e = i.value, Message.toJSON({
    ...e,
    data: {
      ...e.data,
      ...s
    }
  });
  throw i.error || new Error("Invalid Farcaster data");
}, makeRequest = async (e, a, t, r, s = {}, n = {}) => {
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
    errorHandler: e => {
      Sentry.captureException(e), console.error(e);
    },
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
  parentFid: i,
  parentUrl: o,
  fid: d
}) => {
  a = {
    ...extractAndReplaceMentions(a, t.reduce((e, a, t) => (e[a] = r[t], e), {})),
    embeds: s || []
  }, t = {};
  n && (a.parentCastId = {
    hash: hexToBytes(n.slice(2)),
    fid: parseInt(i)
  }, t.parentCastId = {
    fid: i
  }), o && (a.parentUrl = o), t.mentions = a.mentions, a.mentions = a.mentions.map(e => parseInt(e));
  try {
    return await makeRequest(e, 1, a, d, {}, t);
  } catch (e) {
    throw console.error(e), new Error(e);
  }
}, makeCastRemove = async ({
  privateKey: e,
  targetHash: a,
  fid: t
}) => {
  a = {
    targetHash: hexToBytes(a.slice(2))
  };
  return makeRequest(e, 2, a, t);
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
  return makeRequest(e, 5, a, s, {}, t);
}, makeUsernameDataAdd = async ({
  privateKey: e,
  value: a,
  fid: t
}) => {
  var r = {
    type: 6,
    value: t?.slice(0, 15)
  };
  return makeRequest(e, 11, r, t, {
    userDataBody: {
      value: a,
      type: 6
    }
  });
}, makeUserDataAdd = async ({
  privateKey: e,
  type: a,
  value: t,
  fid: r
}) => {
  if (6 === a) return makeUsernameDataAdd({
    value: t,
    fid: r
  });
  a = {
    type: a,
    value: t
  };
  try {
    return await makeRequest(e, 11, a, r);
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
  return makeRequest(e, 6, a, r, {}, t);
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
  return makeRequest(e, 4, a, s, {}, t);
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
  type: 1,
  ...a
}), recast = async ({
  isRemove: e,
  ...a
}) => (e ? makeReactionRemove : makeReactionAdd)({
  type: 2,
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
  recast: recast
};
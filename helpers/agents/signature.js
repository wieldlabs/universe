const ethers = require("ethers")["ethers"], farTokenABI = require("../abi/farToken")["farTokenABI"], decryptAgentWallet = require("./register")["decryptAgentWallet"], Sentry = require("@sentry/node"), crypto = require("crypto"), {
  NobleEd25519Signer,
  getFarcasterTime,
  bytesToHexString,
  ed25519,
  hexStringToBytes
} = require("@farcaster/hub-nodejs"), getConfig = () => ({
  FACTORY_ADDRESS: "0x43116248a582e417bbc3b6d271602bdb1218bf40",
  CHAIN_ID: 8453,
  TOKEN_ABI: farTokenABI,
  FARAGENT_FID: "production" === process.env.NODE_ENV ? 938363 : 259237
}), getHashTips = (e, t, r, a, i = !1) => {
  e = `tip:${e.toString()}:${t.toString()}:${r.toString()}:` + a.toString();
  return i && console.log("Tips string", e), crypto.createHash("sha256").update(e).digest("hex");
}, getHashAuthorization = (e, t, r, a = !1) => {
  e = `authorization:${e.toString()}:${t.toString()}:` + r.toString();
  return a && console.log("Authorization string", e), crypto.createHash("sha256").update(e).digest("hex");
}, signTipsMessage = async ({
  to: e,
  amount: t,
  agentId: r
}) => {
  var a, i;
  if (process.env.FARAGENT_BOT_SIGNER_KEY) return a = new NobleEd25519Signer(process.env.FARAGENT_BOT_SIGNER_KEY), 
  i = getFarcasterTime().value, e = getHashTips(e, t, r, i), t = await a.signMessageHash(hexStringToBytes(e).value), 
  {
    signature: bytesToHexString(t.value).value,
    timestamp: i
  };
  throw new Error("FARAGENT_BOT_SIGNER_KEY is not set");
}, verifyTipsMessage = async ({
  to: e,
  amount: t,
  agentId: r,
  timestamp: a,
  signature: i
}) => {
  if (!process.env.FARAGENT_BOT_SIGNER_KEY) throw new Error("FARAGENT_BOT_SIGNER_KEY is not set");
  var n = await ed25519.getPublicKey(process.env.FARAGENT_BOT_SIGNER_KEY), e = getHashTips(e, t, r, a), t = hexStringToBytes(i).value, r = hexStringToBytes(e).value;
  try {
    return (await ed25519.verifyMessageHashSignature(t, r, n.value)).value;
  } catch (e) {
    return console.error("Signature verification error:", e), !1;
  }
};

async function requestWithdrawSignatureDangerous(e, {
  to: t,
  amount: r
}) {
  var a, i, n, s, o;
  if (e) return a = e.tipWrapperAddress || e.tokenAddress, o = !!e.tipWrapperAddress ? "FarAgentTips" : "FarToken", 
  i = Math.floor(Date.now() / 1e3) + 3600, n = new ethers.providers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/" + process.env.BASE_NODE_URL, {
    name: "base",
    chainId: getConfig().CHAIN_ID
  }), s = new ethers.Wallet.fromMnemonic(process.env.SWARM_KEY), s = await decryptAgentWallet(s, e), 
  e = {
    name: o,
    version: "1",
    chainId: getConfig().CHAIN_ID,
    verifyingContract: a
  }, o = await new ethers.Contract(a, getConfig().TOKEN_ABI, n).nonces(t), {
    signature: await s._signTypedData(e, {
      Withdraw: [ {
        name: "to",
        type: "address"
      }, {
        name: "amount",
        type: "uint256"
      }, {
        name: "nonce",
        type: "uint256"
      }, {
        name: "deadline",
        type: "uint256"
      } ]
    }, {
      to: t,
      amount: r,
      nonce: o,
      deadline: i
    }),
    deadline: i,
    nonce: o,
    to: t,
    amount: r
  };
  throw new Error("Agent is required");
}

const signAuthorizationMessage = async ({
  fid: e,
  agentId: t
}) => {
  var r, a;
  if (process.env.FARAGENT_BOT_SIGNER_KEY) return r = new NobleEd25519Signer(process.env.FARAGENT_BOT_SIGNER_KEY), 
  a = getFarcasterTime().value, e = getHashAuthorization(e, t, a), t = await r.signMessageHash(hexStringToBytes(e).value), 
  {
    signature: bytesToHexString(t.value).value,
    timestamp: a
  };
  throw new Error("FARAGENT_BOT_SIGNER_KEY is not set");
}, verifyAuthorizationMessage = async ({
  fid: e,
  agentId: t,
  timestamp: r,
  signature: a,
  debug: i = !1
}) => {
  if (!process.env.FARAGENT_BOT_SIGNER_KEY) throw new Error("FARAGENT_BOT_SIGNER_KEY is not set");
  var n = await ed25519.getPublicKey(process.env.FARAGENT_BOT_SIGNER_KEY), s = getHashAuthorization(e, t, r), o = hexStringToBytes(a).value, g = hexStringToBytes(s).value;
  try {
    var u = await ed25519.verifyMessageHashSignature(o, g, n.value);
    return i && (Sentry.captureMessage("Authorization signature verification", {
      extra: {
        isValid: u.value,
        fid: e,
        agentId: t,
        timestamp: r,
        signature: a,
        hash: s,
        pubKey: n.value,
        signerFid: getConfig().FARAGENT_FID
      }
    }), console.log("Authorization signature verification", {
      isValid: u.value,
      fid: e,
      agentId: t,
      timestamp: r,
      signature: a,
      hash: s,
      pubKey: n.value,
      signerFid: getConfig().FARAGENT_FID
    })), u.value;
  } catch (e) {
    return console.error("Authorization signature verification error:", e), Sentry.captureException(e), 
    !1;
  }
};

module.exports = {
  signTipsMessage: signTipsMessage,
  verifyTipsMessage: verifyTipsMessage,
  requestWithdrawSignatureDangerous: requestWithdrawSignatureDangerous,
  signAuthorizationMessage: signAuthorizationMessage,
  verifyAuthorizationMessage: verifyAuthorizationMessage
};
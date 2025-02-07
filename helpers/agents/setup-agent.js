const Sentry = require("@sentry/node"), {
  makeUserDataAdd,
  registerUsername
} = require("../farcaster-utils"), Agent = require("../../models/farcaster/agents")["Agent"], CacheService = require("../../services/cache/CacheService")["Service"], {
  decryptSignerKey,
  decryptAgentWallet
} = require("./register"), ethers = require("ethers"), farTokenConfig = require("../constants/far-token-config")["farTokenConfig"], {
  Alchemy,
  Network,
  Utils
} = require("alchemy-sdk");

async function enableAgentNotifications(e) {
  if (!e) return !1;
  var t = new CacheService();
  try {
    return await t.set({
      key: "enableNotifications_" + e,
      value: "1",
      expiresAt: new Date(Date.now() + 7776e6)
    });
  } catch (e) {
    return console.error(e), !1;
  }
}

const UserDataType = {
  PFP: 1,
  DISPLAY: 2,
  BIO: 3,
  USERNAME: 6
};

async function setupUsername(e, t, r, a) {
  try {
    var n;
    t && (16 < (n = t.toLowerCase().replace(/[^a-z0-9-]/g, "")).length ? console.warn("Username too long, skipping username setup") : (await registerUsername({
      fname: n,
      fid: e.fid,
      owner: r.address,
      privateKey: a
    }, r), await makeUserDataAdd({
      privateKey: a,
      fid: e.fid,
      type: UserDataType.USERNAME,
      value: n
    }), console.log(`Username ${n} set up for FID: ` + e.fid)));
  } catch (e) {
    console.warn("Failed to set up username:", e.message);
  }
}

async function uploadMetadataToIPFS(e) {
  try {
    var t = await (await fetch("https://far.quest/api/upload-ipfs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(e)
    })).json();
    if (t.success) return t.json;
    throw new Error(t.message || "Failed to upload to IPFS");
  } catch (e) {
    throw console.error("Error uploading metadata:", e), e;
  }
}

async function setupAgent(t, r = {}) {
  try {
    var a = new ethers.Wallet.fromMnemonic(process.env.SWARM_KEY);
    let e;
    r.username && (e = await decryptAgentWallet(a, t));
    var n, o = t.signerKeys[0];
    if (o) return n = await decryptSignerKey(o, a), r.username && await setupUsername(t, r.username, e, n), 
    (r.displayName || t.name) && await makeUserDataAdd({
      privateKey: n,
      fid: t.fid,
      type: UserDataType.DISPLAY,
      value: r.displayName || t.name
    }), (r.bio || t.bio) && await makeUserDataAdd({
      privateKey: n,
      fid: t.fid,
      type: UserDataType.BIO,
      value: r.bio || t.bio || "AI Agent powered by far.quest"
    }), (r.profileImage || t.avatar) && await makeUserDataAdd({
      privateKey: n,
      fid: t.fid,
      type: UserDataType.PFP,
      value: r.profileImage || t.avatar
    }), console.log("Profile updated successfully for FID:", t.fid), !0;
    throw new Error("No signer keys found");
  } catch (e) {
    throw console.error("Error in setupAgent:", e), Sentry.captureException(e), 
    e;
  }
}

async function deployAgentToken(e, t = {}) {
  try {
    var r = (await new Alchemy({
      apiKey: process.env.BASE_NODE_URL,
      network: Network.BASE_MAINNET
    }).core.getGasPrice()).mul(150).div(100), a = Utils.formatUnits(r, "gwei"), n = ethers.utils.parseUnits(a, "gwei"), o = ethers.utils.parseUnits("0.1", "gwei");
    if (n.gt(o)) throw new Error(`Gas price is too high: ${a} gwei`);
    var i = new ethers.providers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/" + process.env.BASE_NODE_URL, {
      name: "base",
      chainId: 8453
    }), s = new ethers.Wallet.fromMnemonic(process.env.FARCAST_KEY), c = (await uploadMetadataToIPFS({
      name: t.title || t.name,
      symbol: t.symbol,
      description: t.description || t.bio || t.instructions,
      image: t.coverImage || t.imageUrl,
      nsfw: t.nsfw,
      links: {
        twitter: t.twitter,
        website: t.website
      }
    }))["IpfsHash"], d = new ethers.Contract(farTokenConfig.FACTORY_ADDRESS, farTokenConfig.FACTORY_ABI, i), u = new ethers.Wallet(s.privateKey, i), l = (await (await d.connect(u).deploy(t.owner || e.currentOwnerAddress || farTokenConfig.DEFAULT_REFERRER, t.operator, farTokenConfig.DEFAULT_REFERRER, "ipfs://" + c, t.title || t.name, t.symbol, 0, 0, t.allocatedSupply, t.desiredRaise, {
      gasLimit: 6e6,
      maxFeePerGas: n.mul(2),
      maxPriorityFeePerGas: n
    })).wait()).logs.find(e => e.address.toLowerCase() === farTokenConfig.FACTORY_ADDRESS.toLowerCase());
    if (l) return new ethers.utils.Interface(farTokenConfig.FACTORY_ABI).parseLog(l).args.tokenAddress;
    throw new Error("No deployment event found");
  } catch (e) {
    throw console.error("Failed to deploy agent token:", e), e;
  }
}

async function setupFreeAgent({
  currentOwnerFid: r,
  currentOwnerAddress: a,
  instructions: n,
  examples: o,
  options: i = {},
  tokenOptions: s = {},
  shouldDeployToken: c = !0
}) {
  try {
    var d = Date.now(), u = await Agent.findOne({
      $or: [ {
        expiresAt: {
          $exists: !1
        }
      }, {
        expiresAt: {
          $lt: new Date(d - 864e5)
        }
      } ],
      isReserved: !1
    }).sort({
      fid: 1
    });
    if (!u) throw new Error("No free agents available");
    var l = new Date(d + 864e5);
    let e = null, t = `I am an AI agent created by tagging @farfather. My expiration date is ${l.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: !0
    })} if my token does not graduate.`;
    return u.instructions = n || "You are an AI agent.", u.examples = o || "Hello! How can I help you?", 
    u.currentOwnerFid = r, u.currentOwnerAddress = a, u.expiresAt = l, c && (e = await deployAgentToken(u, s), 
    t = `I am an AI agent created by tagging @farfather. My expiration date is ${l.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: !0
    })} if my token (https://far.quest/tokens/${e}) does not graduate.`), await enableAgentNotifications(u.fid), 
    await setupAgent(u, {
      ...i,
      bio: t
    }), await u.save(), {
      agent: u.toJSON(),
      tokenAddress: e
    };
  } catch (e) {
    throw console.error("Error in setupFreeAgent:", e), Sentry.captureException(e), 
    e;
  }
}

module.exports = {
  setupAgent: setupAgent,
  setupFreeAgent: setupFreeAgent,
  deployAgentToken: deployAgentToken,
  enableAgentNotifications: enableAgentNotifications
};
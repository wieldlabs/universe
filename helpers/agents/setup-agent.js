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
  var r = new CacheService();
  try {
    return await r.set({
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

async function setupUsername(e, r, t, a) {
  try {
    var n;
    r && (16 < (n = r.toLowerCase().replace(/[^a-z0-9-]/g, "")).length ? console.warn("Username too long, skipping username setup") : (await registerUsername({
      fname: n,
      fid: e.fid,
      owner: t.address,
      privateKey: a
    }, t), await makeUserDataAdd({
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
    var r = await (await fetch("https://far.quest/api/upload-ipfs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(e)
    })).json();
    if (r.success) return r.json;
    throw new Error(r.message || "Failed to upload to IPFS");
  } catch (e) {
    throw console.error("Error uploading metadata:", e), e;
  }
}

async function setupAgent(r, t = {}) {
  try {
    var a = new ethers.Wallet.fromMnemonic(process.env.SWARM_KEY);
    let e;
    t.username && (e = await decryptAgentWallet(a, r));
    var n, o = r.signerKeys[0];
    if (o) return n = await decryptSignerKey(o, a), t.username && await setupUsername(r, t.username, e, n), 
    (t.displayName || r.name) && await makeUserDataAdd({
      privateKey: n,
      fid: r.fid,
      type: UserDataType.DISPLAY,
      value: t.displayName || r.name
    }), (t.bio || r.bio) && await makeUserDataAdd({
      privateKey: n,
      fid: r.fid,
      type: UserDataType.BIO,
      value: t.bio || r.bio || "AI Agent powered by far.quest"
    }), (t.profileImage || r.avatar) && await makeUserDataAdd({
      privateKey: n,
      fid: r.fid,
      type: UserDataType.PFP,
      value: t.profileImage || r.avatar
    }), console.log("Profile updated successfully for FID:", r.fid), !0;
    throw new Error("No signer keys found");
  } catch (e) {
    throw console.error("Error in setupAgent:", e), Sentry.captureException(e), 
    e;
  }
}

async function deployAgentToken(e, r = {}) {
  try {
    var t = (await new Alchemy({
      apiKey: process.env.BASE_NODE_URL,
      network: Network.BASE_MAINNET
    }).core.getGasPrice()).mul(150).div(100), a = Utils.formatUnits(t, "gwei"), n = ethers.utils.parseUnits(a, "gwei"), o = ethers.utils.parseUnits("0.1", "gwei");
    if (n.gt(o)) throw new Error(`Gas price is too high: ${a} gwei`);
    var i = new ethers.providers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/" + process.env.BASE_NODE_URL, {
      name: "base",
      chainId: 8453
    }), s = new ethers.Wallet.fromMnemonic(process.env.FARCAST_KEY), c = (await uploadMetadataToIPFS({
      name: r.title || r.name,
      symbol: r.symbol,
      description: r.description || r.bio || r.instructions,
      image: r.coverImage || r.imageUrl,
      nsfw: r.nsfw,
      links: {
        twitter: r.twitter,
        website: r.website
      }
    }))["IpfsHash"], p = new ethers.Contract(farTokenConfig.FACTORY_ADDRESS, farTokenConfig.FACTORY_ABI, i), l = new ethers.Wallet(s.privateKey, i), d = (await (await p.connect(l).deploy(r.owner || e.currentOwnerAddress || farTokenConfig.DEFAULT_REFERRER, r.operator, farTokenConfig.DEFAULT_REFERRER, "ipfs://" + c, r.title || r.name, r.symbol, 0, 0, r.allocatedSupply, r.desiredRaise, {
      gasLimit: 6e6,
      maxFeePerGas: n.mul(2),
      maxPriorityFeePerGas: n
    })).wait()).logs.find(e => e.address.toLowerCase() === farTokenConfig.FACTORY_ADDRESS.toLowerCase());
    if (d) return new ethers.utils.Interface(farTokenConfig.FACTORY_ABI).parseLog(d).args.tokenAddress;
    throw new Error("No deployment event found");
  } catch (e) {
    throw console.error("Failed to deploy agent token:", e), e;
  }
}

async function deployAgentTipWrapper(e = {}) {
  try {
    var r = (await new Alchemy({
      apiKey: process.env.BASE_NODE_URL,
      network: Network.BASE_MAINNET
    }).core.getGasPrice()).mul(150).div(100), t = Utils.formatUnits(r, "gwei"), a = ethers.utils.parseUnits(t, "gwei"), n = ethers.utils.parseUnits("0.1", "gwei");
    if (a.gt(n)) throw new Error(`Gas price is too high: ${t} gwei`);
    var o = new ethers.providers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/" + process.env.BASE_NODE_URL, {
      name: "base",
      chainId: 8453
    }), i = new ethers.Wallet.fromMnemonic(process.env.FARCAST_KEY), s = new ethers.Contract(farTokenConfig.TIP_WRAPPER_FACTORY_ADDRESS, farTokenConfig.TIP_WRAPPER_ABI, o), c = new ethers.Wallet(i.privateKey, o), p = (await (await s.connect(c).deploy(e.tokenCreator, e.operator, e.tokenAddress, {
      gasLimit: 6e6,
      maxFeePerGas: a.mul(2),
      maxPriorityFeePerGas: a
    })).wait()).logs.find(e => e.address.toLowerCase() === farTokenConfig.TIP_WRAPPER_FACTORY_ADDRESS.toLowerCase());
    if (p) return new ethers.utils.Interface(farTokenConfig.TIP_WRAPPER_ABI).parseLog(p).args.agentTips;
    throw new Error("No deployment event found");
  } catch (e) {
    throw console.error("Failed to deploy agent token:", e), e;
  }
}

async function setupFreeAgent({
  currentOwnerFid: t,
  currentOwnerAddress: a,
  instructions: n,
  examples: o,
  options: i = {},
  tokenOptions: s = {},
  shouldDeployToken: c = !0
}) {
  try {
    var p = Date.now(), l = await Agent.findOne({
      $or: [ {
        expiresAt: {
          $exists: !1
        }
      }, {
        expiresAt: {
          $lt: new Date(p - 864e5)
        }
      } ],
      isReserved: !1
    }).sort({
      fid: 1
    });
    if (!l) throw new Error("No free agents available");
    var d = new Date(p + 864e5);
    let e = null, r = `I am an AI agent created by tagging @farfather. My expiration date is ${d.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: !0
    })} if my token does not graduate.`;
    return l.instructions = n || "You are an AI agent.", l.examples = o || "Hello! How can I help you?", 
    l.currentOwnerFid = t, l.currentOwnerAddress = a, l.expiresAt = d, c && (e = await deployAgentToken(l, s), 
    r = `I am an AI agent created by tagging @farfather. My expiration date is ${d.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: !0
    })} if my token (https://far.quest/tokens/${e}) does not graduate.`), await enableAgentNotifications(l.fid), 
    await setupAgent(l, {
      ...i,
      bio: r
    }), await l.save(), {
      agent: l.toJSON(),
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
  enableAgentNotifications: enableAgentNotifications,
  deployAgentTipWrapper: deployAgentTipWrapper
};
const ethers = require("ethers")["ethers"], {
  Agent,
  AgentRequest,
  AgentAuthorization
} = require("../../models/farcaster/agents"), {
  getEncryptionKey,
  generateSignerKeyPair,
  encryptSignerKey
} = require("./register"), deployAgentToken = require("./setup-agent")["deployAgentToken"], signAuthorizationMessage = require("./signature")["signAuthorizationMessage"], crypto = require("crypto"), DESIRED_RAISE = ethers.utils.parseEther("1"), PRIMARY_MARKET_SUPPLY = ethers.utils.parseEther("800000000"), DEFAULT_ALLOCATED_SUPPLY = PRIMARY_MARKET_SUPPLY.mul(50).div(100);

async function generateAgent(e, n = {}) {
  const a = ethers.Wallet.createRandom(), {
    signature: t,
    timestamp: s
  } = await getEncryptionKey(e, a.address), i = await a.encrypt(t), {
    publicKey: d,
    privateKey: r
  } = await generateSignerKeyPair(), {
    encryptedKey: o,
    timestamp: A
  } = await encryptSignerKey(r, e, a.address), g = await Agent.startSession();
  let c;
  try {
    c = await g.withTransaction(async () => {
      var e = new Agent({
        key: i,
        agentAddress: a.address.toLowerCase(),
        external: !0,
        fid: a.address,
        type: "CLAN",
        agentId: n.agentId,
        currentOwnerAddress: n.currentOwnerAddress || ethers.ZeroAddress,
        currentOwnerFid: n.currentOwnerFid || -1,
        encryptionMetadata: {
          address: a.address,
          timestamp: s,
          key: "FARQUEST_AGENT_ENCRYPTION"
        },
        signerKeys: [ {
          publicKey: d,
          privateKey: o,
          encryptionMetadata: {
            address: a.address,
            timestamp: A,
            key: "FARQUEST_SIGNER_ENCRYPTION"
          }
        } ]
      }), {
        signature: t,
        timestamp: r
      } = await signAuthorizationMessage({
        fid: n.currentOwnerFid,
        agentId: e._id
      }), t = new AgentAuthorization({
        fid: n.currentOwnerFid,
        agent: e._id,
        isValid: !0,
        limit: Agent.getDefaultLimit(),
        agentEventId: null,
        castHash: crypto.randomBytes(32).toString("hex"),
        signerData: {
          signature: t,
          timestamp: r
        }
      });
      return await e.save({
        session: g
      }), await t.save({
        session: g
      }), {
        agent: e
      };
    });
  } finally {
    await g.endSession();
  }
  return c;
}

async function createClan({
  currentOwnerFid: e,
  currentOwnerAddress: t,
  tokenOptions: r = {},
  shouldDeployToken: n = !0,
  agentRequestId: a
}) {
  try {
    var s, i = (await generateAgent(new ethers.Wallet.fromMnemonic(process.env.SWARM_KEY), {
      currentOwnerFid: e,
      currentOwnerAddress: t,
      agentId: "request-" + a
    }))["agent"];
    return n && (s = await deployAgentToken(i, {
      ...r,
      allocatedSupply: r.allocatedSupply || DEFAULT_ALLOCATED_SUPPLY,
      desiredRaise: DESIRED_RAISE,
      currentOwnerAddress: t,
      currentOwnerFid: e,
      operator: i.agentAddress
    }), i.agentId = "base-" + s, i.tokenAddress = s.toLowerCase(), i.tokenSymbol = r.symbol, 
    await i.save()), a && await AgentRequest.findByIdAndUpdate(a, {
      status: "completed",
      completedAt: new Date(),
      tokenAddress: i.tokenAddress
    }), {
      agent: i
    };
  } catch (e) {
    throw console.error("Script failed:", e), e;
  }
}

module.exports = {
  createClan: createClan,
  generateAgent: generateAgent,
  DESIRED_RAISE: DESIRED_RAISE,
  PRIMARY_MARKET_SUPPLY: PRIMARY_MARKET_SUPPLY,
  DEFAULT_ALLOCATED_SUPPLY: DEFAULT_ALLOCATED_SUPPLY
};
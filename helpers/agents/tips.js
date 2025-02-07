const ethers = require("ethers")["ethers"], {
  Agent,
  AgentTip,
  AgentTipLog
} = require("../../models/farcaster/agents"), AuthService = require("../../services/AuthService")["Service"], requestWithdrawSignatureDangerous = require("./signature")["requestWithdrawSignatureDangerous"];

async function claimTipsDangerous(e, r, t) {
  if (!e || !r || !t) throw new Error("Invalid address, agentId, or destination address");
  r = await Agent.findById(r);
  if (!r) throw new Error("Agent not found");
  var i = await AgentTip.getTipAmountForFidAndAgentId(e, r._id);
  if (0 === i) return null;
  if (await AgentTip.markTipsAsClaimedForFidAndAgentId(e, r._id, i), 1e6 < i) throw new Error("Amount is too large, are you passing in full tokens not wei?");
  var n = ethers.utils.parseEther(i.toString()), {
    signature: t,
    deadline: n,
    nonce: a,
    to: s,
    amount: d
  } = await requestWithdrawSignatureDangerous(r, {
    to: t,
    amount: n
  });
  return await AgentTipLog.create({
    agent: r._id,
    deadline: n,
    nonce: a,
    signature: t,
    to: s,
    amount: i,
    requesterAddress: e
  }), {
    signature: t,
    deadline: n,
    nonce: a.toString(),
    to: s,
    amount: d.toString()
  };
}

async function verifyAddressAndClaimTips({
  address: e,
  chainId: r,
  signature: t,
  agentId: i
}) {
  if (!(e && r && t && i)) throw new Error("Missing required parameters: address, chainId, signature, agentId, or destinationAddress");
  var n = new AuthService();
  try {
    await n.authBySignature({
      address: e,
      chainId: r,
      signature: t
    });
  } catch (e) {
    throw new Error("Invalid signature or unauthorized address");
  }
  return claimTipsDangerous(e, i, e);
}

module.exports = {
  claimTipsDangerous: claimTipsDangerous,
  verifyAddressAndClaimTips: verifyAddressAndClaimTips
};
const mongoose = require("mongoose"), {
  memcache,
  getHash
} = require("../../../connectmemcache"), {
  agentSchema,
  agentRequestSchema,
  agentAuthorizationSchema,
  agentEventSchema,
  agentTipSchema,
  agentTipLogSchema,
  agentInviteSchema
} = require("../../../schemas/farcaster/agents"), verifyTipsMessage = require("../../../helpers/agents/signature")["verifyTipsMessage"];

class AgentClass {
  static getDefaultLimit(e = null) {
    return e?.defaultLimit || 5e4;
  }
  static getMaxTipAmount(e = null) {
    return e?.maxTipAmount || 2500;
  }
  static getMinTipAmount(e = null) {
    return e?.minTipAmount || 100;
  }
  static ping() {
    console.log("model: AgentClass");
  }
}

agentSchema.loadClass(AgentClass);

const Agent = mongoose.models.Agent || mongoose.model("farcaster.Agent", agentSchema);

class AgentRequestClass {
  static ping() {
    console.log("model: AgentRequestClass");
  }
}

agentRequestSchema.loadClass(AgentRequestClass);

const AgentRequest = mongoose.models.AgentRequest || mongoose.model("farcaster.AgentRequest", agentRequestSchema);

class AgentAuthorizationClass {
  static ping() {
    console.log("model: AgentAuthorizationClass");
  }
  static async findOnlyOne(e) {
    var t = await AgentAuthorization.find(e);
    if (1 < t.length) throw new Error("Multiple agent authorizations found for query: " + JSON.stringify(e));
    return t.length ? t[0] : null;
  }
}

agentAuthorizationSchema.loadClass(AgentAuthorizationClass);

const AgentAuthorization = mongoose.models.AgentAuthorization || mongoose.model("farcaster.AgentAuthorization", agentAuthorizationSchema);

class AgentEventClass {
  static ping() {
    console.log("model: AgentEventClass");
  }
}

agentEventSchema.loadClass(AgentEventClass);

const AgentEvent = mongoose.models.AgentEvent || mongoose.model("farcaster.AgentEvent", agentEventSchema);

class AgentTipClass {
  static ping() {
    console.log("model: AgentTipClass");
  }
  static tipClaimedKey(e) {
    if (e) return getHash("agent-tip-claimed:" + e);
    throw new Error("Invalid agentTipId when generating memcache key");
  }
  static async getTipAmountForFidAndAgentId(e, t) {
    if (!e || !t) throw new Error("Invalid address or agentId");
    e = await AgentTip.find({
      address: e,
      agent: t,
      expiresAt: {
        $gt: new Date()
      },
      claimedAt: {
        $exists: !1
      }
    });
    if (1 < new Set(e.map(e => e.agent.toString())).size) throw new Error("Tips have different agentIds in getTipAmountForFidAndAgentId");
    return e.reduce((e, t) => e + t.amount, 0);
  }
  static async markTipsAsClaimedForFidAndAgentId(e, t, n) {
    if (!e || !t || !n) throw new Error("Invalid address or agentId or amountToClaim");
    const a = await AgentTip.startSession();
    let s = null;
    try {
      if (await a.withTransaction(async () => {
        if (s = await AgentTip.find({
          address: e,
          agent: t,
          expiresAt: {
            $gt: new Date()
          },
          claimedAt: {
            $eq: null
          }
        }, null, {
          session: a
        }), 1 < new Set(s.map(e => e.agent.toString())).size) throw new Error("Tips have different agentIds in markTipsAsClaimedForFidAndAgentId");
        if ((await Promise.all(s.map(e => memcache.get(AgentTipClass.tipClaimedKey(e._id))))).some(e => e && e.value)) throw new Error("Tips already claimed according to memcache (prevent bugs with DB)");
        if (!s.length) throw new Error("No unclaimed tips found");
        if (s.reduce((e, t) => e + t.amount, 0) !== n) throw new Error("Total tips do not match amount to claim");
        if (!(await Promise.all(s.map(async e => e.signerData && await verifyTipsMessage({
          timestamp: e.signerData.timestamp,
          signature: e.signerData.signature,
          to: e.address,
          amount: e.amount,
          agentId: e.agent.toString()
        })))).every(e => e)) throw new Error("Tips verification failed");
        await AgentTip.updateMany({
          address: e,
          agent: t,
          expiresAt: {
            $gt: new Date()
          },
          claimedAt: {
            $eq: null
          }
        }, {
          $set: {
            claimedAt: new Date()
          }
        }, {
          session: a
        });
      }), null === s) throw new Error("Tips not found, session.withTransaction failed?");
      await Promise.all(s.map(e => {
        memcache.set(AgentTipClass.tipClaimedKey(e._id), "true");
      }));
    } finally {
      await a.endSession();
    }
  }
}

agentTipSchema.loadClass(AgentTipClass);

const AgentTip = mongoose.models.AgentTip || mongoose.model("farcaster.AgentTip", agentTipSchema);

class AgentTipLogClass {
  static ping() {
    console.log("model: AgentTipLogClass");
  }
}

agentTipLogSchema.loadClass(AgentTipLogClass);

const AgentTipLog = mongoose.models.AgentTipLog || mongoose.model("farcaster.AgentTipLog", agentTipLogSchema);

class AgentInviteClass {
  static ping() {
    console.log("model: AgentInviteClass");
  }
}

agentInviteSchema.loadClass(AgentInviteClass);

const AgentInvite = mongoose.models.AgentInvite || mongoose.model("farcaster.AgentInvite", agentInviteSchema);

module.exports = {
  Agent: Agent,
  AgentRequest: AgentRequest,
  AgentAuthorization: AgentAuthorization,
  AgentEvent: AgentEvent,
  AgentTip: AgentTip,
  AgentTipLog: AgentTipLog,
  AgentInvite: AgentInvite
};
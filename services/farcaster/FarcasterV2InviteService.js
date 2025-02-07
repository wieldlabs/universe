const Account = require("../../models/Account")["Account"], Referral = require("../../models/Referral")["Referral"], Score = require("../../models/Score")["Score"], ScoreService = require("../ScoreService")["Service"], memcache = require("../../connectmemcache")["memcache"], AccountInvite = require("../../models/AccountInvite")["AccountInvite"], CastHandle = require("../../models/CastHandle")["CastHandle"], getFarcasterL1UserByAnyAddress = require("../../helpers/farcaster")["getFarcasterL1UserByAnyAddress"], {
  Alchemy,
  Network
} = require("alchemy-sdk"), ethers = require("ethers")["ethers"], Sentry = require("@sentry/node"), AgentInvite = require("../../models/farcaster/agents")["AgentInvite"];

let _GLOBAL_PROVIDER;

const getProvider = async () => {
  var e;
  return _GLOBAL_PROVIDER || (e = {
    apiKey: process.env.BASE_NODE_URL,
    network: Network.BASE_MAINNET
  }, e = await new Alchemy(e).config.getProvider(), _GLOBAL_PROVIDER = e);
};

class FarcasterV2InviteService {
  constructor(e) {
    this.scoreService = new ScoreService(), this.scoreType = e || ("development" === process.env.NODE_ENV ? "FARAGENT_beta" : "FARAGENT"), 
    this.INTERNAL_INVITE_CODES = [ "projecteverest", "farquestloyalty", "jcdenton" ], 
    this.INVITE_BYPASS_KEY = "isInvitedForFarAgent", this.ALPHA_TESTER_FIDS = {
      730222: !0,
      ["0x322ac153350E97527A94495a8AdA11fEb29628e0".toLowerCase()]: !0
    }, this.POSITION_TO_BYPASS_INVITE = -1, this.CAST_HANDLE_BONNUS = 2e3, this.quests = {
      followTwitter: {
        id: "followTwitter",
        score: 1e3
      },
      likeLatestTweet: {
        id: "likeLatestTweet",
        score: 1e3
      },
      followDiscord: {
        id: "followDiscord",
        score: 1e3
      },
      joinTelegram: {
        id: "joinTelegram",
        score: 1e3
      },
      followWarpcast: {
        id: "followWarpcast",
        score: 1e3
      },
      likeCast: {
        id: "likeCast",
        score: 1e3
      },
      recastCast: {
        id: "recastCast",
        score: 1e3
      },
      shareCast: {
        id: "shareCast",
        score: 1e3
      },
      followFarcaster: {
        id: "followFarcaster",
        score: 1e3
      },
      shareTwitter: {
        id: "shareTwitter",
        score: 1e3
      }
    }, this.V2_INVITE_CODE_CLAIM_DELAY = 864e5;
  }
  async _getTotalReferral(e) {
    var t = await memcache.get(`Referral:FARAGENT:${e}:total:count`);
    return t ? t.value : (t = await Referral.countDocuments({
      account: e,
      isValid: !0,
      referralOrigin: "FARAGENT"
    }), await memcache.set(`Referral:FARAGENT:${e}:total:count`, t), t);
  }
  async getPlayerPosition({
    context: e,
    initialScore: t = 0
  }) {
    await e.account.populate("addresses");
    e = e.account.addresses[0].address?.toLowerCase(), e = await this.scoreService.getPosition({
      address: e,
      bebdomain: this.scoreType,
      includeNoScore: !0,
      initialScore: t
    });
    return parseInt(e) + 9423;
  }
  async awardScore({
    context: e = null,
    address: t = null,
    score: r
  }) {
    if (!r) throw new Error("Score is required");
    if (!t && !e) throw new Error("Address or context is required");
    e && await e.account.populate("addresses");
    t = t || e.account.addresses[0].address?.toLowerCase();
    return await this.scoreService.setScore({
      address: t,
      scoreType: this.scoreType,
      modifier: r
    });
  }
  async isValidReferrer(e) {
    try {
      var t, r;
      return await getFarcasterL1UserByAnyAddress(e) ? !0 : 0 < (await CastHandle.find({
        owner: e.toLowerCase()
      })).length || (t = await (await getProvider()).getBalance(e), r = ethers.utils.parseEther("0.01"), 
      !!t.gte(r));
    } catch (e) {
      return console.error("Error checking referrer validity:", e), Sentry.captureException(e), 
      !1;
    }
  }
  async applyInvite({
    inviteCode: e,
    referralType: t = "WEB"
  }, r) {
    try {
      var a, s = r.account._id || r.account, o = (await r.account.populate("addresses"), 
      await Referral.findOne({
        uniqueIdentifier: s,
        referralOrigin: "FARAGENT"
      }));
      if (o) return {
        success: !1,
        message: "Already have a referral"
      };
      if (!(a = await AccountInvite.findOne({
        code: e
      }))) throw new Error("Invalid invite code or already used. Try another invite code!");
      if (-1 !== a.maxUseCount && a.useCount >= a.maxUseCount) throw new Error("Invite code has reached the maximum use count");
      if (!await Account.findById(a.account)) throw new Error("Inviter not found");
      var i = r.account.addresses[0].address?.toLowerCase();
      if (await this.isValidReferrer(i)) return a.useCount = a.useCount + 1, await a.save(), 
      await Referral.create({
        code: e,
        referralType: t,
        account: a.account,
        uniqueIdentifier: s,
        extraData: {
          address: i
        },
        referralOrigin: "FARAGENT",
        isValid: !0
      }), await this.awardScore({
        context: r,
        score: 100
      }), await memcache.delete(`Referral:FARAGENT:${a.account}:total:count`, {
        noreply: !0
      }), {
        success: !0,
        message: "Invite applied successfully"
      };
      throw new Error("Invalid referrer - must have Farcaster account, .cast handle, or 0.01 ETH on Base");
    } catch (e) {
      throw console.error("Error applying invite:", e), Sentry.captureException(e), 
      new Error("Failed to apply invite: " + e.message);
    }
  }
  async completeQuest(t, r) {
    try {
      var a = this.quests[t];
      if (!a) throw new Error("Quest not found");
      await r.account.populate("addresses");
      var s = r.account.addresses[0].address?.toLowerCase();
      let e = await Score.findOne({
        address: s,
        scoreType: this.scoreType
      });
      if ((e = e || new Score({
        address: s,
        scoreType: this.scoreType,
        score: "0",
        quests: {}
      })).quests && e.quests[t]) throw new Error("Quest already completed");
      e.quests || (e.quests = {}), e.quests = {
        ...e.quests,
        [t]: a.score
      }, await e.save();
      var o = await this.awardScore({
        address: s,
        score: a.score
      });
      return {
        success: !0,
        message: "Quest completed successfully",
        questId: t,
        score: a.score,
        newScore: o
      };
    } catch (e) {
      throw console.error("Error completing quest:", e), Sentry.captureException(e), 
      new Error("Failed to complete quest: " + e.message);
    }
  }
  async getCompletedQuests(e) {
    try {
      await e.account.populate("addresses");
      var t = e.account.addresses[0].address?.toLowerCase(), r = await Score.findOne({
        address: t,
        scoreType: this.scoreType
      });
      return r && r.quests ? Object.keys(r.quests) : [];
    } catch (e) {
      throw console.error("Error getting completed quests:", e), Sentry.captureException(e), 
      new Error("Failed to get completed quests: " + e.message);
    }
  }
  async _getCastHandlesCount(e) {
    return await CastHandle.countDocuments({
      owner: e.account.addresses[0].address?.toLowerCase()
    });
  }
  async getQuestProgress(e) {
    try {
      await e.account.populate("addresses");
      var t = e.account.addresses[0].address?.toLowerCase(), r = await this._getCastHandlesCount(e) || 0, [ a, s, o, i, c ] = await Promise.all([ this.getCompletedQuests(e), this.scoreService.getCommunityScore({
        address: t,
        bebdomain: this.scoreType
      }), this._getTotalReferral(e.account._id || e.accountId), this.getPlayerPosition({
        context: e,
        initialScore: r * this.CAST_HANDLE_BONNUS
      }), AgentInvite.findOne({
        fid: e.fid
      }) ]), n = await this.getInviteStatus({
        invite: c,
        position: i
      }, e);
      return {
        completedQuests: a,
        totalScore: s + r * this.CAST_HANDLE_BONNUS,
        availableQuests: Object.keys(this.quests),
        questDefinitions: this.quests,
        totalReferrals: o,
        position: i,
        inviteStatus: n
      };
    } catch (e) {
      throw console.error("Error getting quest progress:", e), Sentry.captureException(e), 
      new Error("Failed to get quest progress: " + e.message);
    }
  }
  async validateInviteV2Code(e) {
    try {
      const [ r, a ] = e.split("-");
      if (r && a) {
        var t = await AccountInvite.findOne({
          code: r
        });
        if (t && t.extraData?.farAgentInviteCodes?.includes(a)) return t.extraData = {
          ...t.extraData,
          farAgentInviteCodes: t.extraData.farAgentInviteCodes.filter(e => e !== a)
        }, await t.save(), !0;
      }
      throw new Error("Invalid invite code or already used. Try another invite code!");
    } catch (e) {
      throw console.error("Error validating V2 invite code:", e), Sentry.captureException(e), 
      e;
    }
  }
  async claimInviteV2Codes(e) {
    try {
      if (!e) throw new Error("No invite found for account");
      var t = Date.now();
      if (t - (e.extraData?.lastV2InviteCodeClaimedAt || 0) < this.V2_INVITE_CODE_CLAIM_DELAY) throw new Error("Too soon to claim new invite codes");
      var r = e.extraData?.farAgentInviteCodes || [], a = 5 - r.length, s = Array.from({
        length: a
      }, () => Math.random().toString(36).substring(2, 8));
      return e.extraData = {
        ...e.extraData,
        farAgentInviteCodes: [ ...r, ...s ],
        lastV2InviteCodeClaimedAt: t
      }, await e.save(), {
        success: !0,
        newCodes: s,
        totalCodes: e.extraData.farAgentInviteCodes
      };
    } catch (e) {
      throw console.error("Error claiming V2 invite codes:", e), Sentry.captureException(e), 
      e;
    }
  }
  async getInviteStatus({
    invite: e,
    position: t
  }, r) {
    return t <= this.POSITION_TO_BYPASS_INVITE || this.ALPHA_TESTER_FIDS[r?.fid] ? (await this.setInviteStatus({
      fid: r.fid,
      status: !0
    }), !0) : !!e && !!e.isInvited;
  }
  async setInviteStatus({
    fid: e,
    status: t
  }) {
    await AgentInvite.updateOne({
      fid: e
    }, {
      isInvited: t
    });
  }
}

module.exports = {
  Service: FarcasterV2InviteService
};
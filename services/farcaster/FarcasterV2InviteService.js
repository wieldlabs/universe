const Account = require("../../models/Account")["Account"], Referral = require("../../models/Referral")["Referral"], Score = require("../../models/Score")["Score"], ScoreService = require("../ScoreService")["Service"], memcache = require("../../connectmemcache")["memcache"], AccountInvite = require("../../models/AccountInvite")["AccountInvite"], CastHandle = require("../../models/CastHandle")["CastHandle"], getFarcasterL1UserByAnyAddress = require("../../helpers/farcaster")["getFarcasterL1UserByAnyAddress"], {
  Alchemy,
  Network
} = require("alchemy-sdk"), ethers = require("ethers")["ethers"], Sentry = require("@sentry/node");

let _GLOBAL_PROVIDER;

const getProvider = async () => {
  var e;
  return _GLOBAL_PROVIDER || (e = {
    apiKey: process.env.BASE_NODE_URL,
    network: Network.BASE_MAINNET
  }, e = await new Alchemy(e).config.getProvider(), _GLOBAL_PROVIDER = e);
};

class FarcasterV2InviteService {
  constructor() {
    this.scoreService = new ScoreService(), this.scoreType = "development" === process.env.NODE_ENV ? "farquest_v2_beta" : "farquest_v2", 
    this.INTERNAL_INVITE_CODES = [ "projecteverest", "farquestloyalty", "jcdenton" ], 
    this.quests = {
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
      }
    }, this.V2_INVITE_CODE_CLAIM_DELAY = 864e5;
  }
  async _getTotalReferral(e) {
    var r = await memcache.get(`Referral:FARQUEST_V2:${e}:total:count`);
    return r ? r.value : (r = await Referral.countDocuments({
      account: e,
      isValid: !0,
      referralOrigin: "FARQUEST_V2"
    }), await memcache.set(`Referral:FARQUEST_V2:${e}:total:count`, r), r);
  }
  async getPlayerPosition({
    context: e
  }) {
    await e.account.populate("addresses");
    e = e.account.addresses[0].address?.toLowerCase(), e = await this.scoreService.getPosition({
      address: e,
      bebdomain: this.scoreType,
      includeNoScore: !0
    });
    return parseInt(e);
  }
  async awardScore({
    context: e = null,
    address: r = null,
    score: t
  }) {
    if (!t) throw new Error("Score is required");
    if (!r && !e) throw new Error("Address or context is required");
    e && await e.account.populate("addresses");
    r = r || e.account.addresses[0].address?.toLowerCase();
    return await this.scoreService.setScore({
      address: r,
      scoreType: this.scoreType,
      modifier: t
    });
  }
  async isValidReferrer(e) {
    try {
      var r, t;
      return await getFarcasterL1UserByAnyAddress(e) ? !0 : 0 < (await CastHandle.find({
        owner: e.toLowerCase()
      })).length || (r = await (await getProvider()).getBalance(e), t = ethers.utils.parseEther("0.01"), 
      !!r.gte(t));
    } catch (e) {
      return console.error("Error checking referrer validity:", e), Sentry.captureException(e), 
      !1;
    }
  }
  async applyInvite({
    inviteCode: e,
    referralType: r = "WEB"
  }, t) {
    try {
      var a, s = t.account._id || t.account, o = (await t.account.populate("addresses"), 
      await Referral.findOne({
        uniqueIdentifier: s,
        referralOrigin: "FARQUEST_V2"
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
      var c = t.account.addresses[0].address?.toLowerCase();
      if (await this.isValidReferrer(c)) return a.useCount = a.useCount + 1, await a.save(), 
      await Referral.create({
        code: e,
        referralType: r,
        account: a.account,
        uniqueIdentifier: s,
        extraData: {
          address: c
        },
        referralOrigin: "FARQUEST_V2",
        isValid: !0
      }), await this.awardScore({
        context: t,
        score: 100
      }), await memcache.delete(`Referral:FARQUEST_V2:${a.account}:total:count`, {
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
  async completeQuest(r, t) {
    try {
      var a = this.quests[r];
      if (!a) throw new Error("Quest not found");
      await t.account.populate("addresses");
      var s = t.account.addresses[0].address?.toLowerCase();
      let e = await Score.findOne({
        address: s,
        scoreType: this.scoreType
      });
      if ((e = e || new Score({
        address: s,
        scoreType: this.scoreType,
        score: "0",
        quests: {}
      })).quests && e.quests[r]) throw new Error("Quest already completed");
      e.quests || (e.quests = {}), e.quests = {
        ...e.quests,
        [r]: a.score
      }, await e.save();
      var o = await this.awardScore({
        address: s,
        score: a.score
      });
      return {
        success: !0,
        message: "Quest completed successfully",
        questId: r,
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
      var r = e.account.addresses[0].address?.toLowerCase(), t = await Score.findOne({
        address: r,
        scoreType: this.scoreType
      });
      return t && t.quests ? Object.keys(t.quests) : [];
    } catch (e) {
      throw console.error("Error getting completed quests:", e), Sentry.captureException(e), 
      new Error("Failed to get completed quests: " + e.message);
    }
  }
  async getQuestProgress(t) {
    try {
      await t.account.populate("addresses");
      var a = t.account.addresses[0].address?.toLowerCase();
      const [ d, l, u, w, v ] = await Promise.all([ this.getCompletedQuests(t), this.scoreService.getCommunityScore({
        address: a,
        bebdomain: this.scoreType
      }), this._getTotalReferral(t.account._id || t.accountId), this.getPlayerPosition({
        context: t
      }), AccountInvite.findOne({
        account: t.account._id
      }) ]);
      let r = !1, e = null;
      var s = v.extraData?.v2InviteCodes || [], o = v.extraData?.lastV2InviteCodeClaimedAt || 0, c = Date.now();
      if (s.length < 5 && (0 === o || c - o >= this.V2_INVITE_CODE_CLAIM_DELAY)) try {
        var i = await this.claimInviteV2Codes(v);
        e = i.totalCodes, r = !0;
      } catch (e) {
        console.error("Auto-claim failed:", e), r = !1;
      } else r = !1, e = s;
      e = e.map(e => v.code + "-" + e);
      var n = o + this.V2_INVITE_CODE_CLAIM_DELAY;
      return {
        completedQuests: d,
        totalScore: l,
        availableQuests: Object.keys(this.quests),
        questDefinitions: this.quests,
        totalReferrals: u,
        position: w,
        justClaimedCodes: r,
        ...e && {
          codes: e
        },
        ...n && {
          nextCodesClaimableAt: n
        }
      };
    } catch (e) {
      throw console.error("Error getting quest progress:", e), Sentry.captureException(e), 
      new Error("Failed to get quest progress: " + e.message);
    }
  }
  async validateInviteV2Code(e) {
    try {
      const [ t, a ] = e.split("-");
      if (t && a) {
        var r = await AccountInvite.findOne({
          code: t
        });
        if (r && r.extraData?.v2InviteCodes?.includes(a)) return r.extraData = {
          ...r.extraData,
          v2InviteCodes: r.extraData.v2InviteCodes.filter(e => e !== a)
        }, await r.save(), !0;
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
      var r = Date.now();
      if (r - (e.extraData?.lastV2InviteCodeClaimedAt || 0) < this.V2_INVITE_CODE_CLAIM_DELAY) throw new Error("Too soon to claim new invite codes");
      var t = e.extraData?.v2InviteCodes || [], a = 5 - t.length, s = Array.from({
        length: a
      }, () => Math.random().toString(36).substring(2, 8));
      return e.extraData = {
        ...e.extraData,
        v2InviteCodes: [ ...t, ...s ],
        lastV2InviteCodeClaimedAt: r
      }, await e.save(), {
        success: !0,
        newCodes: s,
        totalCodes: e.extraData.v2InviteCodes
      };
    } catch (e) {
      throw console.error("Error claiming V2 invite codes:", e), Sentry.captureException(e), 
      e;
    }
  }
}

module.exports = {
  Service: FarcasterV2InviteService
};
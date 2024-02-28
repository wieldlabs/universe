const Quest = require("../models/quests/Quest")["Quest"], CommunityQuestAccount = require("../models/quests/CommunityQuestAccount")["CommunityQuestAccount"], {
  Casts,
  Reactions,
  ReactionType
} = require("../models/farcaster"), FarcasterServiceV2 = require("../services/identities/FarcasterServiceV2")["Service"], QuestService = require("./QuestService")["Service"], ListingLogs = require("../models/farcaster")["ListingLogs"], getMemcachedClient = require("../connectmemcached")["getMemcachedClient"], FARQUEST_FID = "12741";

class CommunityQuestService extends QuestService {
  async canSatisfyRequirement(e, {
    requirement: t,
    quest: a,
    questData: s
  }, r) {
    if (t?.type.includes("VALID_NFT")) return await this._canCompleteValidNFTQuest(a, {
      requirement: t
    }, r);
    if (t?.type.includes("FARCASTER_")) {
      await r.account.populate?.("addresses");
      var i = r.account?.addresses?.[0]?.address;
      for (const d of await new FarcasterServiceV2().getProfilesByAddress(i)) {
        if ("FARCASTER_ACCOUNT" === t.type) return !0;
        if (t.type.includes("FARCASTER_CASTS_")) {
          if (parseInt(t.type.replace("FARCASTER_CASTS_", "")) <= await Casts.count({
            fid: d._id,
            deletedAt: null
          })) return !0;
        } else if (t.type.includes("FARCASTER_FOLLOWERS_")) {
          var n = parseInt(t.type.replace("FARCASTER_FOLLOWERS_", ""));
          if (d.followers >= n) return !0;
        } else if (t.type.includes("FARCASTER_LIKES_")) {
          if (parseInt(t.type.replace("FARCASTER_LIKES_", "")) <= await Reactions.count({
            fid: {
              $ne: d._id
            },
            targetFid: d._id,
            reactionType: ReactionType.REACTION_TYPE_LIKE,
            deletedAt: null
          })) return !0;
        } else if ("FARCASTER_FARQUEST_TAGGED" === t.type) if (0 < (await Casts.find({
          fid: d._id,
          mentions: {
            $in: [ parseInt(FARQUEST_FID) ]
          },
          timestamp: {
            $gt: new Date(Date.now() - 6048e5)
          },
          deletedAt: null
        })).filter(e => e.text.toLowerCase().includes("purple") && !e.text.includes("purple-season-certificate2x.png")).length) return !0;
      }
      return !1;
    }
    switch (t?.type) {
     case "AUTO_CLAIM":
      return !0;

     case "TOTAL_NFT":
      return await this._canCompleteTotalNFTQuest(a, {
        requirement: t
      }, r);

     case "COMMUNITY_PARTICIPATION":
      var c = t.data?.find(e => "requiredParticipationCount" === e.key)?.value || 1;
      return e.accounts?.length >= c;

     case "MULTICHOICE_SINGLE_QUIZ":
      var u, c = s.find(e => "answer" === e.key)?.value;
      return c ? (u = t.data?.find(e => "correctAnswer" === e.key)?.value, c.toLowerCase() === u?.toLowerCase()) : !1;

     case "FARMARKET_LISTING_FIRST":
      return r.account ? (await r.account.populate?.("addresses"), !!await ListingLogs.exists({
        eventType: "Listed",
        from: r.account.addresses?.[0]?.address
      })) : !1;

     case "FARMARKET_BUY_FIRST":
      return r.account ? (await r.account.populate?.("addresses"), !!await ListingLogs.exists({
        eventType: "Bought",
        from: r.account.addresses?.[0]?.address
      })) : !1;

     case "FARMARKET_OFFER_FIRST":
      return r.account ? (await r.account.populate?.("addresses"), !!await ListingLogs.exists({
        eventType: "OfferMade",
        from: r.account.addresses?.[0]?.address
      })) : !1;

     default:
      return !1;
    }
  }
  async canClaimReward(t, {
    questData: a = []
  }, s) {
    if (!t) return !1;
    if (t.isArchived) return !1;
    const r = await Quest.findById(t.quest);
    var e, i;
    return !(!r || r.startsAt && r.startsAt > new Date() || (await CommunityQuestAccount.findOne({
      communityQuest: t._id,
      account: s.account?._id || s.accountId
    }))?.rewardClaimed) && (!r.requirements || 0 === r.requirements.length || (e = await Promise.all(r.requirements.map(e => this.canSatisfyRequirement(t, {
      requirement: e,
      quest: r,
      questData: a
    }, s))), "OR" === (i = r.requirementJoinOperator || "OR") ? e.some(e => e) : "AND" === i && e.every(e => e)));
  }
  async getQuestStatus(e, t, a) {
    return e && a.account ? e.isArchived ? "COMPLETED" : await this.canClaimReward(e, t, a) ? "CAN_CLAIM_REWARD" : (t = await CommunityQuestAccount.findOne({
      communityQuest: e._id,
      account: a.account._id
    })) && t.rewardClaimed ? "CHECKED_IN" : "IN_PROGRESS" : "IN_PROGRESS";
  }
  async checkIfCommunityQuestClaimedByAddress(e, t, a) {
    if (e) {
      var a = a.account?._id || a.accountId, s = getMemcachedClient();
      try {
        var r = `CommunityQuestService:checkIfCommunityQuestClaimedByAddress${e._id}:` + a;
        if (await s.get(r)) return !0;
      } catch (e) {
        console.log(e);
      }
      if ((await CommunityQuestAccount.findOne({
        communityQuest: e._id,
        account: a
      }))?.rewardClaimed) {
        try {
          var i = `CommunityQuestService:checkIfCommunityQuestClaimedByAddress${e._id}:` + a;
          await s.set(i, "true");
        } catch (e) {
          console.log(e);
        }
        return !0;
      }
    }
    return !1;
  }
}

module.exports = {
  Service: CommunityQuestService
};
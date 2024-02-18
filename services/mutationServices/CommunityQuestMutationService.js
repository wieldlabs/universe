const Quest = require("../../models/quests/Quest")["Quest"], CommunityQuest = require("../../models/quests/CommunityQuest")["CommunityQuest"], CommunityReward = require("../../models/quests/CommunityReward")["CommunityReward"], CommunityRewardAccount = require("../../models/quests/CommunityRewardAccount")["CommunityRewardAccount"], CommunityQuestAccount = require("../../models/quests/CommunityQuestAccount")["CommunityQuestAccount"], AccountInventory = require("../../models/AccountInventory")["AccountInventory"], Community = require("../../models/Community")["Community"], _CommunityService = require("../CommunityService")["Service"], CommunityQuestService = require("../CommunityQuestService")["Service"], _CommunityRewardService = require("../CommunityRewardService")["Service"], _CommunityAssetsService = require("../assets/CommunityAssetsService")["Service"], _ScoreService = require("../ScoreService")["Service"], crypto = require("crypto"), CommunityAssetsService = new _CommunityAssetsService(), ScoreService = new _ScoreService();

class CommunityQuestMutationService extends CommunityQuestService {
  async _canAdminCommunityOrError(e, t, r) {
    if (await new _CommunityService().canAdmin(e, t, r)) return !0;
    throw new Error("You do not have permission to perform this action.");
  }
  _getScoreType(e) {
    var t = "development" === process.env.NODE_ENV ? "beta" : "playground";
    return {
      wield: "wield",
      playground: t,
      bebcaster: t,
      sdk: t
    }[e] || t;
  }
  async _claimRewardByType(e, {
    communityId: r,
    scoreType: i
  }, a) {
    if ("ASSET_3D" === e.type) await CommunityAssetsService.addQuantityOrCreateAsset(null, {
      assetId: e.rewardId,
      type: e.type,
      communityId: r,
      maxQuantity: e.quantity
    }); else if ("SCORE" === e.type) {
      await a.account?.populate?.("addresses");
      var o = a.account?.addresses?.[0]?.address;
      if (!o) throw new Error("You must be logged in to claim this reward.");
      var n = this._getScoreType(i);
      await ScoreService.setScore({
        address: o,
        scoreType: n,
        modifier: e.quantity
      });
    } else if ("IMAGE" === e.type) {
      if (!a.account) throw new Error("You must be logged in to claim this reward.");
      await AccountInventory.createOrUpdate({
        accountId: a.account._id,
        rewardId: e.rewardId,
        rewardType: e.type,
        modifier: e.quantity
      });
    } else if ("RANDOM" === e.type) {
      if (!a.account) throw new Error("You must be logged in to claim this reward.");
      o = (await this.getQuestReward(e)).rewards.filter(e => e.percentage) || [];
      const u = o.reduce((e, t) => e + t.percentage, 0);
      let t = 0;
      n = o.map(e => (t += e.percentage / u * 1e4, {
        ...e.toJSON(),
        cumulativePercentage: t
      }));
      const m = crypto.randomInt(1, 10001);
      o = n.find(e => m <= e.cumulativePercentage);
      return o ? this._claimRewardByType(o, {
        communityId: r,
        scoreType: i
      }, a) : null;
    }
    return e;
  }
  async _claimReward(e, {
    communityId: t
  }, r) {
    e = await Quest.findById(e.quest);
    const i = await Community.findById(t).select("bebdomain");
    if (e?.rewards?.length) return await Promise.all(e.rewards.map(async e => {
      return await this._claimRewardByType(e, {
        communityId: t,
        scoreType: i?.bebdomain
      }, r);
    }));
    throw new Error("No rewards found for this quest");
  }
  async claimRewardOrError(e, {
    communityId: t,
    questId: r,
    questData: i
  }, a) {
    var o = await CommunityQuest.findOne({
      community: t,
      quest: r
    });
    if (!o) throw new Error("No Quest found");
    if (await this.canClaimReward(o, {
      communityId: t,
      questId: r,
      questData: i
    }, a)) return i = await this._claimReward(o, {
      communityId: t,
      questId: r
    }, a), await CommunityQuestAccount.createOrUpdate({
      accountId: a.account._id,
      communityQuestId: o._id,
      rewardClaimed: !0,
      isNotified: !0
    }), {
      communityQuest: o,
      rewards: i
    };
    throw new Error("Reward cannot be claimed at this time.");
  }
  async claimCommunityRewardOrError(e, {
    communityRewardId: t
  }, r) {
    t = await CommunityReward.findById(t);
    if (!t) throw new Error("No Community Reward found");
    var i = new _CommunityRewardService(), a = await Community.findById(t.community).select("bebdomain"), o = (await r.account?.populate?.("addresses"), 
    r.account?.addresses?.[0]?.address);
    if (await i.canClaimCommunityReward(t, {
      bebdomain: a?.bebdomain,
      address: o
    }, r)) return i = await this._claimRewardByType(t.reward, {
      communityId: t.community,
      scoreType: a?.bebdomain
    }, r), "EXCHANGE" === t.type && await ScoreService.setScore({
      address: o,
      scoreType: a.bebdomain,
      modifier: -t.score
    }), (o = await CommunityRewardAccount.findOrCreate({
      accountId: r.account._id,
      communityRewardId: t._id
    })).rewardClaimedCount = o.rewardClaimedCount + 1, await o.save(), {
      reward: i,
      communityReward: t
    };
    throw new Error("Reward cannot be claimed at this time.");
  }
  async completeQuest(e, {
    communityId: t,
    questId: r
  }, i) {
    var a = await CommunityQuest.findOne({
      community: t,
      quest: r
    });
    if (!a) throw new Error(`CommunityQuest not found for questId ${r}, communityId ` + t);
    "CAN_CLAIM_REWARD" === await this.getQuestStatus(a, {
      communityId: t,
      questId: r
    }, i) && await CommunityQuestAccount.findOrCreate({
      accountId: i.account._id,
      communityQuestId: a._id
    });
  }
}

module.exports = {
  Service: CommunityQuestMutationService
};
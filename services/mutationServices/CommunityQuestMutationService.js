const Quest = require("../../models/quests/Quest")["Quest"], CommunityQuest = require("../../models/quests/CommunityQuest")["CommunityQuest"], CommunityReward = require("../../models/quests/CommunityReward")["CommunityReward"], CommunityRewardAccount = require("../../models/quests/CommunityRewardAccount")["CommunityRewardAccount"], CommunityQuestAccount = require("../../models/quests/CommunityQuestAccount")["CommunityQuestAccount"], AccountInventory = require("../../models/AccountInventory")["AccountInventory"], Community = require("../../models/Community")["Community"], _CommunityService = require("../CommunityService")["Service"], CommunityQuestService = require("../CommunityQuestService")["Service"], _CommunityRewardService = require("../CommunityRewardService")["Service"], _CommunityAssetsService = require("../assets/CommunityAssetsService")["Service"], _ScoreService = require("../ScoreService")["Service"], CommunityAssetsService = new _CommunityAssetsService(), ScoreService = new _ScoreService();

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
    communityId: t,
    scoreType: r
  }, i) {
    if ("ASSET_3D" === e.type) await CommunityAssetsService.addQuantityOrCreateAsset(null, {
      assetId: e.rewardId,
      type: e.type,
      communityId: t,
      maxQuantity: e.quantity
    }); else if ("SCORE" === e.type) {
      await i.account?.populate?.("addresses");
      t = i.account?.addresses?.[0]?.address;
      if (!t) throw new Error("You must be logged in to claim this reward.");
      r = this._getScoreType(r);
      await ScoreService.setScore({
        address: t,
        scoreType: r,
        modifier: e.quantity
      });
    } else if ("IMAGE" === e.type) {
      if (!i.account) throw new Error("You must be logged in to claim this reward.");
      await AccountInventory.createOrUpdate({
        accountId: i.account._id,
        rewardId: e.rewardId,
        rewardType: e.type,
        modifier: e.quantity
      });
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
  }, o) {
    var a = await CommunityQuest.findOne({
      community: t,
      quest: r
    });
    if (!a) throw new Error("No Quest found");
    if (await this.canClaimReward(a, {
      communityId: t,
      questId: r,
      questData: i
    }, o)) return i = await this._claimReward(a, {
      communityId: t,
      questId: r
    }, o), await CommunityQuestAccount.createOrUpdate({
      accountId: o.account._id,
      communityQuestId: a._id,
      rewardClaimed: !0,
      isNotified: !0
    }), {
      communityQuest: a,
      rewards: i
    };
    throw new Error("Reward cannot be claimed at this time.");
  }
  async claimCommunityRewardOrError(e, {
    communityRewardId: t
  }, r) {
    t = await CommunityReward.findById(t);
    if (!t) throw new Error("No Community Reward found");
    var i = new _CommunityRewardService(), o = await Community.findById(t.community).select("bebdomain"), a = (await r.account?.populate?.("addresses"), 
    r.account?.addresses?.[0]?.address);
    if (await i.canClaimCommunityReward(t, {
      bebdomain: o?.bebdomain,
      address: a
    }, r)) return i = await this._claimRewardByType(t.reward, {
      communityId: t.community,
      scoreType: o?.bebdomain
    }, r), "EXCHANGE" === t.type && await ScoreService.setScore({
      address: a,
      scoreType: o.bebdomain,
      modifier: -t.score
    }), (a = await CommunityRewardAccount.findOrCreate({
      accountId: r.account._id,
      communityRewardId: t._id
    })).rewardClaimedCount = a.rewardClaimedCount + 1, await a.save(), {
      reward: i,
      communityReward: t
    };
    throw new Error("Reward cannot be claimed at this time.");
  }
  async completeQuest(e, {
    communityId: t,
    questId: r
  }, i) {
    var o = await CommunityQuest.findOne({
      community: t,
      quest: r
    });
    if (!o) throw new Error(`CommunityQuest not found for questId ${r}, communityId ` + t);
    "CAN_CLAIM_REWARD" === await this.getQuestStatus(o, {
      communityId: t,
      questId: r
    }, i) && await CommunityQuestAccount.findOrCreate({
      accountId: i.account._id,
      communityQuestId: o._id
    });
  }
}

module.exports = {
  Service: CommunityQuestMutationService
};
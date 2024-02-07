const mongoose = require("mongoose"), schema = require("../../schemas/quests/communityRewardAccount")["schema"];

class CommunityRewardAccountClass {
  static ping() {
    console.log("model: CommunityRewardAccountClass");
  }
  static async findOrCreate({
    accountId: o,
    communityRewardId: e,
    isNotified: t = !1,
    rewardClaimedCount: a = 0
  }) {
    if (e && o) return await this.findOne({
      communityReward: e,
      account: o
    }) || await this.create({
      communityReward: e,
      account: o,
      isNotified: t,
      rewardClaimedCount: a
    });
    throw new Error("Missing required parameters");
  }
}

schema.loadClass(CommunityRewardAccountClass);

const CommunityRewardAccount = mongoose.models.CommunityRewardAccount || mongoose.model("CommunityRewardAccount", schema);

module.exports = {
  CommunityRewardAccount: CommunityRewardAccount
};
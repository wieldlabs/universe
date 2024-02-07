const mongoose = require("mongoose"), schema = require("../../schemas/quests/communityQuestAccount")["schema"];

class CommunityQuestAccountClass {
  static ping() {
    console.log("model: CommunityQuestAccountClass");
  }
  static async findOrCreate({
    accountId: t,
    communityQuestId: e
  }) {
    if (t && e) return await this.findOne({
      account: t,
      communityQuest: e
    }) || await this.create({
      account: t,
      communityQuest: e
    });
    throw new Error("Missing required parameters");
  }
  static async createOrUpdate({
    accountId: t,
    communityQuestId: e,
    rewardClaimed: s,
    isNotified: o
  }) {
    var c;
    if (t && e) return (c = await this.findOne({
      account: t,
      communityQuest: e
    })) ? (c.rewardClaimed = s, c.isNotified = o, c.save()) : await this.create({
      account: t,
      communityQuest: e,
      rewardClaimed: s,
      isNotified: o
    });
    throw new Error("Missing required parameters");
  }
}

schema.loadClass(CommunityQuestAccountClass);

const CommunityQuestAccount = mongoose.models.CommunityQuestAccount || mongoose.model("CommunityQuestAccount", schema);

module.exports = {
  CommunityQuestAccount: CommunityQuestAccount
};
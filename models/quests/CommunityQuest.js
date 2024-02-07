const mongoose = require("mongoose"), schema = require("../../schemas/quests/communityQuest")["schema"];

class CommunityQuestClass {
  static ping() {
    console.log("model: CommunityQuestClass");
  }
  static async findOrCreate({
    communityId: s,
    questId: e,
    isArchived: t,
    accountIds: o
  }) {
    var m;
    if (s && e) return (m = await this.findOne({
      community: s,
      quest: e
    })) ? (o && (m.accounts = [ ...new Set([ ...m.accounts || [], ...o ]) ]), void 0 !== t && (m.isArchived = t), 
    m.save()) : await this.create({
      community: s,
      quest: e,
      isArchived: t,
      accounts: o
    });
    throw new Error("Missing required parameters");
  }
}

schema.loadClass(CommunityQuestClass);

const CommunityQuest = mongoose.models.CommunityQuest || mongoose.model("CommunityQuest", schema);

module.exports = {
  CommunityQuest: CommunityQuest
};
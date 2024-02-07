const mongoose = require("mongoose"), schema = require("../../schemas/quests/communityReward")["schema"];

class CommunityRewardClass {
  static ping() {
    console.log("model: CommunityRewardClass");
  }
  static _buildMatchQuery(e = {}) {
    let t = {};
    return t = e.community ? {
      ...t,
      community: mongoose.Types.ObjectId(e.community)
    } : t;
  }
  static async findAndSort({
    limit: e = 20,
    offset: t = 0,
    sort: s = "score",
    filters: i = {}
  } = {}) {
    s = "-" === s[0] ? {
      [s.slice(1)]: -1,
      _id: 1
    } : {
      [s]: 1
    }, i = this._buildMatchQuery(i);
    return await this.aggregate([ {
      $match: i
    }, {
      $sort: s
    }, {
      $skip: parseInt(t, 10)
    }, {
      $limit: parseInt(e, 10)
    } ]);
  }
  static async findOrCreate({
    communityId: e,
    isArchived: t,
    reward: s,
    score: i,
    type: a,
    claimableQuantity: o = 1
  }) {
    if (e && s) return await this.create({
      community: e,
      isArchived: t,
      reward: s,
      score: i,
      type: a,
      claimableQuantity: o
    });
    throw new Error("Missing required parameters");
  }
}

schema.loadClass(CommunityRewardClass);

const CommunityReward = mongoose.models.CommunityReward || mongoose.model("CommunityReward", schema);

module.exports = {
  CommunityReward: CommunityReward
};
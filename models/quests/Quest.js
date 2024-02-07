const mongoose = require("mongoose"), schema = require("../../schemas/quests/quest")["schema"];

class QuestClass {
  static ping() {
    console.log("model: QuestClass");
  }
  static _buildMatchQuery(s = {}) {
    let e = {};
    return s.communities?.length && (e = {
      ...e,
      community: {
        $in: s.communities.map(s => mongoose.Types.ObjectId(s))
      }
    }), e = s.community ? {
      ...e,
      community: mongoose.Types.ObjectId(s.community)
    } : e;
  }
  static async findAndSort({
    limit: s = 20,
    offset: e = 0,
    sort: t = "updatedAt",
    filters: o = {}
  } = {}) {
    t = "-" === t[0] ? {
      [t.slice(1)]: -1,
      _id: 1
    } : {
      [t]: 1
    }, o = this._buildMatchQuery(o);
    return await this.aggregate([ {
      $match: o
    }, {
      $sort: t
    }, {
      $skip: parseInt(e, 10)
    }, {
      $limit: parseInt(s, 10)
    } ]);
  }
}

schema.loadClass(QuestClass);

const Quest = mongoose.models.Quest || mongoose.model("Quest", schema);

module.exports = {
  Quest: Quest
};
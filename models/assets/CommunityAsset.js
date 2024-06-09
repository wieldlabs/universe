const mongoose = require("mongoose"), schema = require("../../schemas/assets/communityAsset")["schema"];

class CommunityAssetClass {
  static ping() {
    console.log("model: CommunityAssetClass");
  }
  static async findAndSort({
    limit: s = 20,
    offset: e = 0,
    filters: t = {},
    sort: o = "_id"
  } = {}) {
    let m = {};
    t.communityId && (m = {
      ...m,
      community: new mongoose.Types.ObjectId(t.communityId)
    }), t.type && (m = {
      ...m,
      type: new mongoose.Types.ObjectId(t.type)
    });
    t = "-" === o[0] ? {
      [o.slice(1)]: -1,
      _id: 1
    } : {
      [o]: 1
    };
    return this.aggregate([ {
      $match: m
    }, {
      $sort: t
    }, {
      $skip: parseInt(e, 10)
    }, {
      $limit: parseInt(s, 10)
    } ]);
  }
}

schema.loadClass(CommunityAssetClass);

const CommunityAsset = mongoose.models.CommunityAsset || mongoose.model("CommunityAsset", schema);

module.exports = {
  CommunityAsset: CommunityAsset
};
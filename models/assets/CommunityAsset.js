const mongoose = require("mongoose"), schema = require("../../schemas/assets/communityAsset")["schema"];

class CommunityAssetClass {
  static ping() {
    console.log("model: CommunityAssetClass");
  }
  static async findAndSort({
    limit: s = 20,
    offset: t = 0,
    filters: e = {},
    sort: o = "_id"
  } = {}) {
    let m = {};
    e.communityId && (m = {
      ...m,
      community: mongoose.Types.ObjectId(e.communityId)
    }), e.type && (m = {
      ...m,
      type: mongoose.Types.ObjectId(e.type)
    });
    e = "-" === o[0] ? {
      [o.slice(1)]: -1,
      _id: 1
    } : {
      [o]: 1
    };
    return this.aggregate([ {
      $match: m
    }, {
      $sort: e
    }, {
      $skip: parseInt(t, 10)
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
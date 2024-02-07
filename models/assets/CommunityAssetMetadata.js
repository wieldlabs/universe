const mongoose = require("mongoose"), schema = require("../../schemas/assets/communityAssetMetadata")["schema"];

class CommunityAssetMetadataClass {
  static ping() {
    console.log("model: CommunityAssetMetadataClass");
  }
  static async findAndSort({
    limit: s = 20,
    offset: t = 0,
    communityAssetId: e,
    sort: a = "_id"
  } = {}) {
    if (e) return e = {
      communityAsset: mongoose.Types.ObjectId(e)
    }, a = "-" === a[0] ? {
      [a.slice(1)]: -1,
      _id: 1
    } : {
      [a]: 1
    }, this.aggregate([ {
      $match: e
    }, {
      $sort: a
    }, {
      $skip: parseInt(t, 10)
    }, {
      $limit: parseInt(s, 10)
    } ]);
    throw new Error("communityAssetId is required");
  }
}

schema.loadClass(CommunityAssetMetadataClass);

const CommunityAssetMetadata = mongoose.models.CommunityAssetMetadata || mongoose.model("CommunityAssetMetadata", schema);

module.exports = {
  CommunityAssetMetadata: CommunityAssetMetadata
};
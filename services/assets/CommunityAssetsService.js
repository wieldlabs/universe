const Asset3D = require("../../models/assets/Asset3D")["Asset3D"], CommunityAsset = require("../../models/assets/CommunityAsset")["CommunityAsset"], CommunityAssetMetadata = require("../../models/assets/CommunityAssetMetadata")["CommunityAssetMetadata"], Vector3D = require("../../helpers/vector3D")["Vector3D"];

class CommunityAssetService {
  async getAsset(t) {
    return !t || "ASSET_3D" !== t.type ? null : Asset3D.findById(t.asset);
  }
  async initializeCommunityAssetMetadata(e, {
    maxQuantity: a
  } = {
    maxQuantity: 0
  }) {
    if (!e) return null;
    var s = [];
    for (let t = 0; t < a; t++) s.push({
      communityAsset: e._id
    });
    return (await CommunityAssetMetadata.insertMany(s)).map(t => t._id);
  }
  async addQuantityOrCreateAsset(t, {
    communityId: e,
    assetId: a,
    type: s,
    maxQuantity: i
  }) {
    var n = await this.getAsset({
      asset: a,
      type: s
    });
    if (!n) throw new Error("Invalid asset data");
    a = await CommunityAsset.findOne({
      community: e,
      asset: a
    });
    if (a) {
      a.maxQuantity += i;
      const m = await this.initializeCommunityAssetMetadata(a, {
        maxQuantity: i
      });
      return a.metadata = [ ...a.metadata || [], ...m ], a.save();
    }
    a = new CommunityAsset({
      community: e,
      type: s,
      asset: n._id,
      maxQuantity: i
    });
    const m = await this.initializeCommunityAssetMetadata(a, {
      maxQuantity: i
    });
    return a.metadata = m, a.save();
  }
  async editCommunityAsset(t, {
    metadataId: e,
    position: a,
    deleteAsset: s
  }) {
    if (!t || !a || !e) throw new Error("No more items available!");
    var {
      x: a,
      y: i,
      z: n
    } = new Vector3D(a).normalize(), e = await CommunityAssetMetadata.findById(e);
    if (e) return e.position = s ? null : {
      x: a,
      y: i,
      z: n
    }, [ t, await e.save() ];
    throw new Error(`You can only place ${t.maxQuantity} of this asset`);
  }
}

module.exports = {
  Service: CommunityAssetService
};
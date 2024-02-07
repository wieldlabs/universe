const _CommunityAssetService = require("../../../services/assets/CommunityAssetsService")["Service"], CommunityAssetMetadata = require("../../../models/assets/CommunityAssetMetadata")["CommunityAssetMetadata"], CommunityAssetService = new _CommunityAssetService(), resolvers = {
  CommunityAssetItem: {
    __resolveType(e) {
      return e.type, "Asset3DUnion";
    }
  },
  CommunityAsset: {
    asset: async e => {
      var t = await CommunityAssetService.getAsset(e);
      return "ASSET_3D" === e.type ? {
        _id: e.asset,
        type: e.type,
        asset3D: t
      } : null;
    },
    metadata: async (e, t) => {
      return await CommunityAssetMetadata.findAndSort({
        communityAssetId: e._id,
        limit: t.limit,
        offset: t.offset,
        sort: t.sort
      });
    }
  }
};

module.exports = {
  resolvers: resolvers
};
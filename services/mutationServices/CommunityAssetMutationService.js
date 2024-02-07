const CommunityAsset = require("../../models/assets/CommunityAsset")["CommunityAsset"], Community = require("../../models/Community")["Community"], _CommunityService = require("../CommunityService")["Service"], CommunityAssetsService = require("../assets/CommunityAssetsService")["Service"];

class CommunityQuestMutationService extends CommunityAssetsService {
  async _canAdminCommunityOrError(e, t, i) {
    if (await new _CommunityService().canAdmin(e, t, i)) return !0;
    throw new Error("Only admins of the community can edit. If you are an admin, please make sure you are signed in.");
  }
  async editCommunityAssetOrError(e, {
    communityAssetId: t,
    position: i,
    positions: s,
    deleteAsset: m,
    metadataId: n
  }, o) {
    t = await CommunityAsset.findById(t);
    if (t) return await Community.findById(t.community), await this.editCommunityAsset(t, {
      position: i,
      positions: s,
      deleteAsset: m,
      metadataId: n
    });
    throw new Error("Community asset not found for this id");
  }
}

module.exports = {
  Service: CommunityQuestMutationService
};
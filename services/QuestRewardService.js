const Asset3D = require("../models/assets/Asset3D")["Asset3D"], Image = require("../models/Image")["Image"];

class QuestRewardService {
  async createQuestRewardItem({
    type: e,
    data: a
  }) {
    let i = null;
    try {
      switch (e) {
       case "ASSET_3D":
        i = await Asset3D.create({
          url: a.url,
          format: a.format,
          assetType: a.assetType,
          name: a.name,
          previewImage: a.previewImage
        });
        break;

       case "IMAGE":
        i = await Image.create({
          src: a.src,
          isVerified: !!a.isVerified,
          verificationOrigin: a.verifyOrigin,
          verificationTokenId: a.verificationTokenId,
          verificationChainId: a.verificationChainId,
          verificationContractAddress: a.verificationContractAddress,
          verificationExternalUrl: a.verificationExternalUrl,
          name: a.name,
          metadata: a.metadata,
          description: a.description,
          layers: a.layers
        });
        break;

       case "NFT":
        if (!a.verificationContractAddress || !a.verificationTokenId) throw new Error("NFT requires a verificationContractAddress and a verificationTokenId");
        i = await Image.create({
          src: a.src,
          isVerified: !0,
          verificationOrigin: "NFT",
          verificationTokenId: a.verificationTokenId,
          verificationChainId: a.verificationChainId,
          verificationContractAddress: a.verificationContractAddress,
          verificationExternalUrl: a.verificationExternalUrl,
          name: a.name,
          metadata: a.metadata,
          description: a.description,
          layers: a.layers
        });
        break;

       default:
        return null;
      }
      return i;
    } catch (e) {
      return null;
    }
  }
  async getQuestRewardItem({
    rewardId: e,
    type: a
  }) {
    let i = null;
    switch (a) {
     case "ASSET_3D":
      i = await Asset3D.findById(e);
      break;

     case "IMAGE":
     case "NFT":
      i = await Image.findById(e);
      break;

     default:
      return null;
    }
    return i;
  }
}

module.exports = {
  Service: QuestRewardService
};
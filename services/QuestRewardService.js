const Asset3D = require("../models/assets/Asset3D")["Asset3D"], Image = require("../models/Image")["Image"], QuestRandomReward = require("../models/quests/QuestRandomReward")["QuestRandomReward"];

class QuestRewardService {
  async createQuestRewardItem({
    type: e,
    data: a
  }) {
    let r = null;
    try {
      switch (e) {
       case "ASSET_3D":
        r = await Asset3D.create({
          url: a.url,
          format: a.format,
          assetType: a.assetType,
          name: a.name,
          previewImage: a.previewImage
        });
        break;

       case "RANDOM":
        r = await QuestRandomReward.create({
          rewards: a.rewards
        });
        break;

       case "IMAGE":
        r = await Image.create({
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
        r = await Image.create({
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
      return r;
    } catch (e) {
      return null;
    }
  }
  async getQuestRewardItem({
    rewardId: e,
    type: a
  }) {
    let r = null;
    switch (a) {
     case "ASSET_3D":
      r = await Asset3D.findById(e);
      break;

     case "IMAGE":
     case "NFT":
      r = await Image.findById(e);
      break;

     case "RANDOM":
      r = await QuestRandomReward.findById(e);
      break;

     default:
      return null;
    }
    return r;
  }
}

module.exports = {
  Service: QuestRewardService
};
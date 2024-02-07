const _QuestService = require("../../services/QuestService")["Service"], resolvers = {
  QuestRewardItem: {
    __resolveType(e) {
      switch (e.type) {
       case "ASSET_3D":
        return "Asset3DUnion";

       case "IMAGE":
        return "ImageUnion";

       default:
        return "Asset3DUnion";
      }
    }
  },
  QuestReward: {
    reward: async e => {
      var r = await new _QuestService().getQuestReward(e);
      return "ASSET_3D" === e.type ? {
        _id: e.rewardId,
        type: e.type,
        asset3D: r
      } : "IMAGE" === e.type ? {
        _id: e.rewardId,
        type: e.type,
        image: r
      } : null;
    }
  }
};

module.exports = {
  resolvers: resolvers
};
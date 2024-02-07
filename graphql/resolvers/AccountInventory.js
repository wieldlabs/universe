const _QuestRewardService = require("../../services/QuestRewardService")["Service"], Account = require("../../models/Account")["Account"], resolvers = {
  AccountInventoryItem: {
    account: async e => {
      return await Account.findById(e.account);
    },
    reward: async e => {
      var r = await new _QuestRewardService().getQuestRewardItem({
        type: e.rewardType,
        rewardId: e.rewardId
      });
      return "ASSET_3D" === e.rewardType ? {
        _id: e.rewardId,
        type: e.rewardType,
        asset3D: r
      } : "IMAGE" === e.rewardType ? {
        _id: e.rewardId,
        type: e.rewardType,
        image: r
      } : null;
    }
  }
};

module.exports = {
  resolvers: resolvers
};
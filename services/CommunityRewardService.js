const Community = require("../models/Community")["Community"], CommunityRewardAccount = require("../models/quests/CommunityRewardAccount")["CommunityRewardAccount"], _ScoreService = require("./ScoreService")["Service"];

class CommunityRewardService {
  async canClaimCommunityReward(e, {
    bebdomain: r,
    address: i
  }, n) {
    if (!e) return !1;
    if (e.isArchived) return !1;
    if (!i || !r) return !1;
    if (-1 !== e.claimableQuantity && ((await CommunityRewardAccount.findOne({
      communityReward: e._id,
      account: n.accountId || n.account._id
    }))?.rewardClaimedCount || 0) >= e.claimableQuantity) return !1;
    return !(await new _ScoreService().getCommunityScore({
      address: i,
      bebdomain: r
    }) < e.score);
  }
}

module.exports = {
  Service: CommunityRewardService
};
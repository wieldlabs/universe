const _ContentService = require("./ContentService")["Service"], QuestRewardService = require("./QuestRewardService")["Service"], _IndexerRuleService = require("./IndexerRuleService")["Service"], _AlchemyService = require("./AlchemyService")["Service"], Quest = require("../models/quests/Quest")["Quest"], CommunityQuest = require("../models/quests/CommunityQuest")["CommunityQuest"], AccountAddress = require("../models/AccountAddress")["AccountAddress"], IndexerRule = require("../models/IndexerRule")["IndexerRule"], prod = require("../helpers/registrar")["prod"], CastHandle = require("../models/CastHandle")["CastHandle"], getAddressPasses = require("../helpers/farcaster-utils")["getAddressPasses"];

class QuestService extends QuestRewardService {
  requiredDataByRequirementType(e) {
    switch (e) {
     case "COMMUNITY_PARTICIPATION":
      return [ "richBlockId", "requiredParticipationCount" ];

     case "MULTICHOICE_SINGLE_QUIZ":
      return [ "question", "answers", "correctAnswer" ];

     default:
      return [];
    }
  }
  async getQuestReward(e) {
    return this.getQuestRewardItem(e);
  }
  checkRequirementDataOrError({
    type: e,
    data: r
  }) {
    var t = this.requiredDataByRequirementType(e);
    if (t?.length) {
      t = t.filter(t => !r?.find?.(e => e?.key === t));
      if (t?.length) throw new Error(`Missing data for ${e} requirement: ` + t.join(", "));
    }
    return !0;
  }
  async _canCompleteCommunityParticipationQuest(e, {
    requirement: t,
    communityId: r
  }, a) {
    t = t?.data?.find?.(e => "richBlockId" === e?.key)?.value;
    if (!t) return !1;
    var s = new _IndexerRuleService();
    try {
      var n, i = await IndexerRule.findOne({
        ruleOwnerType: 2,
        ruleOwnerId: t
      });
      return i ? !!(n = await AccountAddress.findOne({
        account: a.account._id || a.accountId
      })) && s.canClaimRole(i, {
        data: {
          communityId: r,
          address: n.address
        }
      }) : !1;
    } catch (e) {
      return !1;
    }
  }
  async _canCompleteValidNFTQuest(e, {
    requirement: t
  }, r) {
    const a = {};
    t?.data?.forEach(e => {
      e?.key && (a[e.key] = e.value);
    });
    var {
      contractAddress: t,
      count: s = 1,
      attributeType: n = null,
      attributeValue: i = null,
      chain: u = "eth-mainnet"
    } = a;
    if (!t) return !1;
    var d = {
      "eth-mainnet": prod().NODE_URL,
      "opt-mainnet": process.env.OPTIMISM_NODE_URL
    }, d = new _AlchemyService({
      apiKey: d[u],
      chain: u
    });
    try {
      return await r.account?.populate?.("addresses"), await d.verifyOwnership({
        address: r.account.addresses?.[0]?.address,
        contractAddresses: [ t ],
        count: s,
        attributeType: n,
        attributeValue: i
      });
    } catch (e) {
      return !1;
    }
  }
  async _canCompleteTotalNFTQuest(e, {
    requirement: t
  }, r) {
    const a = {};
    t?.data?.forEach(e => {
      e?.key && (a[e.key] = e.value);
    });
    var {
      contractAddress: t,
      count: s = 1
    } = a;
    if (!t) return !1;
    prod().NODE_URL, process.env.OPTIMISM_NODE_URL;
    try {
      t.split(",");
      await r.account?.populate?.("addresses");
      var n = r.account.addresses?.[0]?.address?.toLowerCase?.();
      return s <= (await getAddressPasses(n, !1)).passes?.length;
    } catch (e) {
      return console.error(e), !1;
    }
  }
  async createQuestRewards({
    rewards: e = []
  } = {}) {
    return e?.length ? await Promise.all(e.map(async t => {
      let r = t.rewardId;
      if (!r) if ("RANDOM" === t.type) {
        let e = [];
        t.rewards?.length && (e = await this.createQuestRewards({
          rewards: t.rewards
        }));
        var a = await this.createQuestRewardItem({
          type: t.type,
          data: {
            ...t.data,
            rewards: e
          }
        });
        r = a?._id;
      } else {
        a = await this.createQuestRewardItem({
          type: t.type,
          data: t.data
        });
        r = a?._id;
      }
      return {
        type: t.type,
        rewardId: r,
        quantity: t.quantity,
        title: t.title,
        isSponsored: t.isSponsored,
        percentage: t.percentage
      };
    })) : [];
  }
  async createQuestRequirements({
    requirements: e = []
  } = {}) {
    return e?.length ? await Promise.all(e.map(async e => (this.checkRequirementDataOrError({
      type: e.type,
      data: e.data
    }), {
      type: e.type,
      data: e.data,
      title: e.title
    }))) : [];
  }
  async createWithRequirementsAndRewards({
    title: e,
    description: t = {
      raw: "",
      html: "",
      json: ""
    },
    schedule: r,
    imageUrl: a,
    requirements: s = [],
    rewards: n = [],
    community: i,
    startsAt: u,
    endsAt: d
  } = {}) {
    t = new _ContentService().makeContent({
      contentRaw: t.raw,
      contentHtml: t.html,
      contentJson: t.json
    }), e = new Quest({
      title: e,
      description: t,
      imageUrl: a,
      schedule: r,
      community: i,
      startsAt: u,
      endsAt: d
    });
    return e.requirements = await this.createQuestRequirements({
      requirements: s
    }), e.rewards = await this.createQuestRewards({
      rewards: n
    }), await e.save(), await CommunityQuest.findOrCreate({
      communityId: i,
      questId: e._id
    }), e;
  }
}

module.exports = {
  Service: QuestService
};
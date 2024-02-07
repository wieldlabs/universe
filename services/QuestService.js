const _ContentService = require("./ContentService")["Service"], QuestRewardService = require("./QuestRewardService")["Service"], _IndexerRuleService = require("./IndexerRuleService")["Service"], _AlchemyService = require("./AlchemyService")["Service"], Quest = require("../models/quests/Quest")["Quest"], CommunityQuest = require("../models/quests/CommunityQuest")["CommunityQuest"], AccountAddress = require("../models/AccountAddress")["AccountAddress"], IndexerRule = require("../models/IndexerRule")["IndexerRule"], prod = require("../helpers/registrar")["prod"];

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
    var n = new _IndexerRuleService();
    try {
      var i, s = await IndexerRule.findOne({
        ruleOwnerType: 2,
        ruleOwnerId: t
      });
      return s ? !!(i = await AccountAddress.findOne({
        account: a.account._id || a.accountId
      })) && n.canClaimRole(s, {
        data: {
          communityId: r,
          address: i.address
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
      count: n = 1,
      attributeType: i = null,
      attributeValue: s = null,
      chain: u = "eth-mainnet"
    } = a;
    if (!t) return !1;
    var c = {
      "eth-mainnet": prod().NODE_URL,
      "opt-mainnet": process.env.OPTIMISM_NODE_URL
    }, c = new _AlchemyService({
      apiKey: c[u],
      chain: u
    });
    try {
      return await r.account?.populate?.("addresses"), await c.verifyOwnership({
        address: r.account.addresses?.[0]?.address,
        contractAddresses: [ t ],
        count: n,
        attributeType: i,
        attributeValue: s
      });
    } catch (e) {
      return !1;
    }
  }
  async _canCompleteTotalNFTQuest(e, {
    requirement: t
  }, r) {
    const a = {}, {
      contractAddress: n,
      count: i = 1,
      attributeType: s = null,
      attributeValue: u = null
    } = (t?.data?.forEach(e => {
      e?.key && (a[e.key] = e.value);
    }), a);
    if (!n) return !1;
    const c = {
      "eth-mainnet": prod().NODE_URL,
      "opt-mainnet": process.env.OPTIMISM_NODE_URL
    };
    try {
      var d = n.split(","), o = (await r.account?.populate?.("addresses"), (await Promise.all(d.map(async e => {
        var [ e, t ] = e.split(":");
        return await new _AlchemyService({
          apiKey: c[e],
          chain: e
        }).verifyOwnership({
          address: r.account.addresses?.[0]?.address,
          contractAddresses: [ t ],
          attributeType: s,
          attributeValue: u,
          returnCount: !0
        });
      }))).reduce((e, t) => e + t, 0));
      return i <= o;
    } catch (e) {
      return console.log(e), !1;
    }
  }
  async createQuestRewards({
    rewards: e = []
  } = {}) {
    return e?.length ? await Promise.all(e.map(async e => {
      var t;
      return e.rewardId ? {
        type: e.type,
        rewardId: e.rewardId,
        quantity: e.quantity,
        title: e.title,
        isSponsored: e.isSponsored
      } : (t = await this.createQuestRewardItem({
        type: e.type,
        data: e.data
      }), {
        type: e.type,
        rewardId: t?._id,
        quantity: e.quantity,
        title: e.title,
        isSponsored: e.isSponsored
      });
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
    requirements: n = [],
    rewards: i = [],
    community: s,
    startsAt: u,
    endsAt: c
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
      community: s,
      startsAt: u,
      endsAt: c
    });
    return e.requirements = await this.createQuestRequirements({
      requirements: n
    }), e.rewards = await this.createQuestRewards({
      rewards: i
    }), await e.save(), await CommunityQuest.findOrCreate({
      communityId: s,
      questId: e._id
    }), e;
  }
}

module.exports = {
  Service: QuestService
};
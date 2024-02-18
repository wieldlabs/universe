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
      var s, i = await IndexerRule.findOne({
        ruleOwnerType: 2,
        ruleOwnerId: t
      });
      return i ? !!(s = await AccountAddress.findOne({
        account: a.account._id || a.accountId
      })) && n.canClaimRole(i, {
        data: {
          communityId: r,
          address: s.address
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
      attributeType: s = null,
      attributeValue: i = null,
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
        attributeType: s,
        attributeValue: i
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
      count: s = 1,
      attributeType: i = null,
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
          attributeType: i,
          attributeValue: u,
          returnCount: !0
        });
      }))).reduce((e, t) => e + t, 0));
      return s <= o;
    } catch (e) {
      return console.log(e), !1;
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
    requirements: n = [],
    rewards: s = [],
    community: i,
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
      community: i,
      startsAt: u,
      endsAt: c
    });
    return e.requirements = await this.createQuestRequirements({
      requirements: n
    }), e.rewards = await this.createQuestRewards({
      rewards: s
    }), await e.save(), await CommunityQuest.findOrCreate({
      communityId: i,
      questId: e._id
    }), e;
  }
}

module.exports = {
  Service: QuestService
};
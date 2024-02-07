const express = require("express"), app = express.Router(), Sentry = require("@sentry/node"), CommunityQuestService = require("../services/CommunityQuestService")["Service"], QuestService = require("../services/QuestService")["Service"], _CommunityQuestMutationService = require("../services/mutationServices/CommunityQuestMutationService")["Service"], CommunityQuest = require("../models/quests/CommunityQuest")["CommunityQuest"], Account = require("../models/Account")["Account"], CommunityReward = require("../models/quests/CommunityReward")["CommunityReward"], CommunityRewardAccount = require("../models/quests/CommunityRewardAccount")["CommunityRewardAccount"], Score = require("../models/Score")["Score"], Quest = require("../models/quests/Quest")["Quest"], {
  authContext,
  limiter
} = require("../helpers/express-middleware");

app.get("/v1/:communityId/quests", limiter, async (e, t) => {
  try {
    var s = e.params["communityId"], {
      limit: u,
      offset: a,
      sort: c
    } = e.query, m = await Quest.findAndSort({
      limit: u,
      offset: a,
      sort: c,
      filters: {
        community: s
      }
    });
    t.json({
      message: "Success",
      code: 200,
      success: !0,
      quests: m
    });
  } catch (e) {
    Sentry.captureException(e), t.status(500).json({
      message: e.message
    });
  }
}), app.get("/v1/:communityId/quests/:questId/status", [ limiter, authContext ], async (e, t) => {
  try {
    var {
      communityId: s,
      questId: u
    } = e.params, a = await CommunityQuest.findOne({
      community: s,
      quest: u
    }), c = await new CommunityQuestService().getQuestStatus(a, {
      communityId: s,
      questId: u
    }, e.context);
    t.json({
      message: "Success",
      code: 200,
      success: !0,
      status: c
    });
  } catch (e) {
    Sentry.captureException(e), t.status(500).json({
      message: e.message
    });
  }
}), app.get("/v1/:communityId/leaderboard", limiter, async (e, t) => {
  try {
    var s = e.params["communityId"], u = e.query["limit"], a = await Score.getLeaderboard(s, u);
    t.json({
      message: "Success",
      code: 200,
      success: !0,
      leaderboard: a
    });
  } catch (e) {
    Sentry.captureException(e), t.status(500).json({
      message: e.message
    });
  }
}), app.get("/v1/:communityId/quests/:questId/claimed/:address", limiter, async (e, t) => {
  try {
    var {
      communityId: s,
      questId: u,
      address: a
    } = e.params, c = await Account.findByAddressAndChainId({
      address: a,
      chainId: 1
    });
    if (!c) return t.status(404).json({
      message: "Account not found"
    });
    var m = await CommunityQuest.findOne({
      community: s,
      quest: u
    }), r = await new CommunityQuestService().checkIfCommunityQuestClaimedByAddress(m, {
      communityId: s,
      questId: u
    }, {
      account: c
    });
    t.json({
      message: "Success",
      code: 200,
      success: !0,
      isClaimed: r
    });
  } catch (e) {
    Sentry.captureException(e), t.status(500).json({
      message: e.message
    });
  }
}), app.post("/v1/:communityId/quests/:questId/claim", [ limiter, authContext ], async (e, t) => {
  try {
    var {
      communityId: s,
      questId: u
    } = e.params, a = e.body["questData"], c = (await new _CommunityQuestMutationService().claimRewardOrError(null, {
      communityId: s,
      questId: u,
      questData: a
    }, e.context))["communityQuest"];
    t.json({
      message: "Success",
      code: 200,
      success: !0,
      communityQuest: c
    });
  } catch (e) {
    console.log(e), Sentry.captureException(e), t.status(500).json({
      message: e.message
    });
  }
}), app.get("/v1/:communityId/quests/:questId/status/:address", limiter, async (e, t) => {
  try {
    var {
      communityId: s,
      questId: u,
      address: a
    } = e.params, c = await Account.findOrCreateByAddressAndChainId({
      address: a,
      chainId: 1
    }), m = await CommunityQuest.findOne({
      community: s,
      quest: u
    }), r = await new CommunityQuestService().getQuestStatus(m, {
      communityId: s,
      questId: u
    }, {
      account: c
    });
    t.json({
      message: "Success",
      code: 200,
      success: !0,
      questStatus: r
    });
  } catch (e) {
    Sentry.captureException(e), t.status(500).json({
      message: e.message
    });
  }
}), app.get("/v1/:communityId/quests/:questId", limiter, async (e, t) => {
  try {
    var {
      communityId: s,
      questId: u
    } = e.params, a = await CommunityQuest.findOne({
      community: s,
      quest: u
    });
    if (!a) return t.status(404).json({
      message: "Community Quest not found"
    });
    t.json({
      message: "Success",
      code: 200,
      success: !0,
      communityQuest: a
    });
  } catch (e) {
    Sentry.captureException(e), t.status(500).json({
      message: e.message
    });
  }
}), app.get("/v1/:communityId/rewards", [ limiter, authContext ], async (u, t) => {
  try {
    var e = u.params["communityId"], {
      limit: s,
      offset: a
    } = u.query, c = await CommunityReward.findAndSort({
      limit: s,
      offset: a,
      filters: {
        community: e
      }
    });
    const m = new QuestService();
    await Promise.all(c.map(async e => {
      var t, s;
      if (e.reward) return t = await m.getQuestReward(e.reward), s = await CommunityRewardAccount.findOne({
        communityReward: e._id,
        account: u.context.account?._id || u.context.accountId
      }), e.reward.item = t, e.reward.account = s, t;
    })), t.json({
      message: "Success",
      code: 200,
      success: !0,
      communityRewards: c
    });
  } catch (e) {
    console.log(e), Sentry.captureException(e), t.status(500).json({
      message: e.message
    });
  }
}), app.post("/v1/:communityId/rewards/:communityRewardId", [ limiter, authContext ], async (e, t) => {
  try {
    var s = e.params["communityRewardId"], {
      reward: u,
      communityReward: a
    } = await new _CommunityQuestMutationService().claimCommunityRewardOrError(null, {
      communityRewardId: s
    }, e.context);
    t.json({
      message: "Success",
      code: 200,
      success: !0,
      reward: u,
      communityReward: a
    });
  } catch (e) {
    console.log(e), Sentry.captureException(e), t.status(500).json({
      message: e.message
    });
  }
}), module.exports = {
  router: app
};
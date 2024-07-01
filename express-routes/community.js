const express = require("express"), app = express.Router(), Sentry = require("@sentry/node"), CommunityQuestService = require("../services/CommunityQuestService")["Service"], QuestService = require("../services/QuestService")["Service"], _CommunityQuestMutationService = require("../services/mutationServices/CommunityQuestMutationService")["Service"], CommunityQuest = require("../models/quests/CommunityQuest")["CommunityQuest"], Account = require("../models/Account")["Account"], CommunityReward = require("../models/quests/CommunityReward")["CommunityReward"], CommunityRewardAccount = require("../models/quests/CommunityRewardAccount")["CommunityRewardAccount"], Score = require("../models/Score")["Score"], Quest = require("../models/quests/Quest")["Quest"], {
  authContext,
  limiter
} = require("../helpers/express-middleware"), getAddressPasses = require("../helpers/farcaster-utils")["getAddressPasses"], {
  memcache,
  getHash
} = require("../connectmemcache");

app.get("/v1/:communityId/quests", limiter, async (s, t) => {
  try {
    var a = s.params["communityId"], {
      limit: r,
      offset: u,
      sort: c
    } = s.query, m = getHash(`communityQuestsCache:${a}:${r}:${u}:` + c), o = await memcache.get(m);
    let e;
    o ? e = JSON.parse(o.value) : (e = await Quest.findAndSort({
      limit: r,
      offset: u,
      sort: c,
      filters: {
        community: a
      }
    }), await memcache.set(m, JSON.stringify(e), {
      lifetime: 900
    })), t.json({
      message: "Success",
      code: 200,
      success: !0,
      quests: e
    });
  } catch (e) {
    console.error(e), Sentry.captureException(e), t.status(500).json({
      message: e.message
    });
  }
}), app.get("/v1/:communityId/quests/:questId/status", [ limiter, authContext ], async (e, s) => {
  try {
    var {
      communityId: t,
      questId: a
    } = e.params, r = await CommunityQuest.findOne({
      community: t,
      quest: a
    }), u = await new CommunityQuestService().getQuestStatus(r, {
      communityId: t,
      questId: a
    }, e.context);
    s.json({
      message: "Success",
      code: 200,
      success: !0,
      status: u
    });
  } catch (e) {
    console.error(e), Sentry.captureException(e), s.status(500).json({
      message: e.message
    });
  }
}), app.get("/v1/:communityId/leaderboard", limiter, async (e, s) => {
  try {
    var t = e.params["communityId"], a = e.query["limit"], r = await Score.getLeaderboard(t, a);
    s.json({
      message: "Success",
      code: 200,
      success: !0,
      leaderboard: r
    });
  } catch (e) {
    console.error(e), Sentry.captureException(e), s.status(500).json({
      message: e.message
    });
  }
}), app.get("/v1/:communityId/quests/:questId/claimed/:address", limiter, async (e, s) => {
  try {
    var {
      communityId: t,
      questId: a,
      address: r
    } = e.params, u = await Account.findByAddressAndChainId({
      address: r,
      chainId: 1
    });
    if (!u) return s.status(404).json({
      message: "Account not found"
    });
    var c = await CommunityQuest.findOne({
      community: t,
      quest: a
    }), m = await new CommunityQuestService().checkIfCommunityQuestClaimedByAddress(c, {
      communityId: t,
      questId: a
    }, {
      account: u
    });
    s.json({
      message: "Success",
      code: 200,
      success: !0,
      isClaimed: m
    });
  } catch (e) {
    console.error(e), Sentry.captureException(e), s.status(500).json({
      message: e.message
    });
  }
}), app.post("/v1/:communityId/quests/:questId/claim/:address", [ limiter, authContext ], async (e, s) => {
  try {
    var t, {
      communityId: a,
      questId: r,
      address: u
    } = e.params, c = e.body["questData"], m = new _CommunityQuestMutationService(), o = (await getAddressPasses(u, !0))["isHolder"];
    return o ? (t = (await m.claimRewardOrError(null, {
      communityId: a,
      questId: r,
      questData: c
    }, e.context))["communityQuest"], s.json({
      message: "Success",
      code: 200,
      success: !0,
      communityQuest: t
    })) : s.status(500).json({
      message: "You can only claim the reward if you hold a .cast handle in your address."
    });
  } catch (e) {
    console.error(e), Sentry.captureException(e), s.status(500).json({
      message: e.message
    });
  }
}), app.get("/v1/:communityId/quests/:questId/status/:address", limiter, async (e, s) => {
  try {
    var {
      communityId: t,
      questId: a,
      address: r
    } = e.params, u = await Account.findOrCreateByAddressAndChainId({
      address: r,
      chainId: 1
    }), c = await CommunityQuest.findOne({
      community: t,
      quest: a
    }), m = await new CommunityQuestService().getQuestStatus(c, {
      communityId: t,
      questId: a
    }, {
      account: u
    });
    s.json({
      message: "Success",
      code: 200,
      success: !0,
      questStatus: m
    });
  } catch (e) {
    console.error(e), Sentry.captureException(e), s.status(500).json({
      message: e.message
    });
  }
}), app.get("/v1/:communityId/quests/:questId", limiter, async (e, s) => {
  try {
    var {
      communityId: t,
      questId: a
    } = e.params, r = await CommunityQuest.findOne({
      community: t,
      quest: a
    });
    if (!r) return s.status(404).json({
      message: "Community Quest not found"
    });
    s.json({
      message: "Success",
      code: 200,
      success: !0,
      communityQuest: r
    });
  } catch (e) {
    console.error(e), Sentry.captureException(e), s.status(500).json({
      message: e.message
    });
  }
}), app.get("/v1/:communityId/rewards", [ limiter, authContext ], async (a, s) => {
  try {
    var e = a.params["communityId"], {
      limit: t,
      offset: r
    } = a.query, u = await CommunityReward.findAndSort({
      limit: t,
      offset: r,
      filters: {
        community: e
      }
    });
    const c = new QuestService();
    await Promise.all(u.map(async e => {
      var s, t;
      if (e.reward) return s = await c.getQuestReward(e.reward), t = await CommunityRewardAccount.findOne({
        communityReward: e._id,
        account: a.context.account?._id || a.context.accountId
      }), e.reward.item = s, e.reward.account = t, s;
    })), s.json({
      message: "Success",
      code: 200,
      success: !0,
      communityRewards: u
    });
  } catch (e) {
    console.error(e), Sentry.captureException(e), s.status(500).json({
      message: e.message
    });
  }
}), app.post("/v1/:communityId/rewards/:communityRewardId", [ limiter, authContext ], async (e, s) => {
  try {
    var t = e.params["communityRewardId"], {
      reward: a,
      communityReward: r
    } = await new _CommunityQuestMutationService().claimCommunityRewardOrError(null, {
      communityRewardId: t
    }, e.context);
    s.json({
      message: "Success",
      code: 200,
      success: !0,
      reward: a,
      communityReward: r
    });
  } catch (e) {
    console.error(e), Sentry.captureException(e), s.status(500).json({
      message: e.message
    });
  }
}), module.exports = {
  router: app
};
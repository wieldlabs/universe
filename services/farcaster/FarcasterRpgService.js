const {
  Player,
  Rune,
  Monster
} = require("../../models/farcaster/rpg"), Referral = require("../../models/Referral")["Referral"], ScoreService = require("../ScoreService")["Service"], memcache = require("../../connectmemcache")["memcache"], mongoose = require("mongoose");

class FarcasterRpgService {
  constructor() {
    this.scoreService = new ScoreService(), this.premiumScoreType = "farShards", 
    this.freeScoreType = "development" === process.env.NODE_ENV ? "beta" : "playground", 
    this.freeSummonCost = 25, this.premiumSummonCost = 1, this.freeSummonItemId = "scroll-n", 
    this.premiumSummonItemId = "scroll-p", this.referralRewardPerClaimCount = 10, 
    this.defaultReferralItemId = "scroll-n", this.referralItemUniqueIdToId = {
      "scroll-n": (process.env.NODE_ENV, "66b18d3434a946fdc1e2c224")
    }, this.referralQuests = {
      "referral-5": {
        minReferralCount: 5,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 1
        }
      },
      "referral-10": {
        minReferralCount: 10,
        reward: {
          itemUniqueId: "farpoints",
          quantity: 10
        }
      },
      "referral-15": {
        minReferralCount: 15,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 2
        }
      },
      "referral-25": {
        minReferralCount: 25,
        reward: {
          itemUniqueId: "farpoints",
          quantity: 25
        }
      },
      "referral-50": {
        minReferralCount: 50,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 5
        }
      },
      "referral-75": {
        minReferralCount: 75,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 10
        }
      },
      "referral-100": {
        minReferralCount: 100,
        reward: {
          itemUniqueId: "scroll-p",
          quantity: 1
        }
      },
      "referral-200": {
        minReferralCount: 200,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 10
        }
      },
      "referral-300": {
        minReferralCount: 300,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 10
        }
      },
      "referral-400": {
        minReferralCount: 400,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 10
        }
      },
      "referral-500": {
        minReferralCount: 500,
        reward: {
          itemUniqueId: "scroll-p",
          quantity: 1
        }
      },
      "referral-600": {
        minReferralCount: 600,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 25
        }
      },
      "referral-700": {
        minReferralCount: 700,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 25
        }
      },
      "referral-800": {
        minReferralCount: 800,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 25
        }
      },
      "referral-900": {
        minReferralCount: 900,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 25
        }
      },
      "referral-1000": {
        minReferralCount: 1e3,
        reward: {
          itemUniqueId: "scroll-p",
          quantity: 1
        }
      }
    }, this.summonQuests = {
      "summon-1": {
        minSummonCount: 1,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 1
        }
      },
      "summon-2": {
        minSummonCount: 2,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 1
        }
      },
      "summon-5": {
        minSummonCount: 5,
        reward: {
          itemUniqueId: "farpoints",
          quantity: 10
        }
      },
      "summon-10": {
        minSummonCount: 10,
        reward: {
          itemUniqueId: "farpoints",
          quantity: 50
        }
      },
      "summon-25": {
        minSummonCount: 25,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 5
        }
      },
      "summon-50": {
        minSummonCount: 50,
        reward: {
          itemUniqueId: "scroll-p",
          quantity: 1
        }
      },
      "summon-75": {
        minSummonCount: 75,
        reward: {
          itemUniqueId: "scroll-n",
          quantity: 10
        }
      },
      "summon-100": {
        minSummonCount: 100,
        reward: {
          itemUniqueId: "scroll-p",
          quantity: 1
        }
      }
    };
  }
  async _getTotalReferral(e) {
    var r = await memcache.get(`Referral:TELEGRAM:${e}:total:count`);
    return r ? r.value : (r = await Referral.countDocuments({
      referralType: "TELEGRAM",
      account: e,
      isValid: !0
    }), await memcache.set(`Referral:TELEGRAM:${e}:total:count`, r), r);
  }
  async _randomSummon({
    player: e,
    type: r = "normal"
  }) {
    r = await Monster.randomSummon({
      type: r
    });
    return e.monsters.push({
      monster: r._id,
      currentLevel: 1,
      currentStars: r.stars || 1
    }), await e.save(), r;
  }
  async _summonMonsterWithScore({
    player: e,
    account: r,
    type: t = "normal"
  }) {
    var n = "premium" === t ? this.premiumScoreType : this.freeScoreType, a = await this.scoreService.getCommunityScore({
      address: r.addresses[0].address,
      bebdomain: n
    }), i = "premium" === t ? this.premiumSummonCost : this.freeSummonCost;
    if (a < i) throw new Error("Not enough score to summon monster");
    try {
      var [ o, s ] = await Promise.all([ this.scoreService.setScore({
        address: r.addresses[0].address,
        scoreType: n,
        modifier: -i
      }), this._randomSummon({
        player: e,
        type: t
      }) ]);
      return {
        monster: s,
        newScore: o
      };
    } catch (e) {
      throw console.error("Error during monster summoning:", e), new Error("Failed to summon monster");
    }
  }
  async _canCompleteQuest({
    player: e,
    quest: r
  }, t) {
    return !e.quests[r.id] && (r.minReferralCount ? await this._getTotalReferral(t.accountId || t.account._id) || r.minReferralCount <= 0 : !!r.minSummonCount && e.monsters.length >= r.minSummonCount);
  }
  async _summonMonsterWithItem({
    player: e,
    type: r = "normal"
  }) {
    const t = "premium" === r ? this.premiumSummonItemId : this.freeSummonItemId;
    var n = e.consumableItems.find(e => e.itemUniqueId === t);
    if (!n || 0 === n.quantity) throw new Error("Missing summon item");
    --n.quantity;
    r = await this._randomSummon({
      player: e,
      type: r
    });
    return await e.save(), {
      monster: r,
      updatedItem: n
    };
  }
  async summonMonster({
    type: e = "normal",
    method: r = "score"
  }, t) {
    t = t.account;
    if (!t) throw new Error("Account not found");
    await t.populate("addresses");
    var n = await Player.findOneAndUpdate({
      account: t._id
    }, {
      account: t._id
    }, {
      upsert: !0,
      new: !0
    });
    return "item" === r ? this._summonMonsterWithItem({
      player: n,
      account: t,
      type: e
    }) : this._summonMonsterWithScore({
      player: n,
      account: t,
      type: e
    });
  }
  async getGameState({
    sort: e = "stars"
  }, r) {
    r = r.account;
    if (!r) throw new Error("Account not found");
    var t = await Player.findOne({
      account: r._id
    });
    if (!t) return {
      monsters: [],
      items: [],
      player: null
    };
    var [ r ] = await Promise.all([ this._getTotalReferral(r._id), t.populate({
      path: "monsters.monster"
    }), t.populate({
      path: "consumableItems.item"
    }) ]);
    let n = [];
    var a = t.consumableItems;
    return "stars" === e ? n = t.monsters.sort((e, r) => r.currentStars - e.currentStars) : "level" === e && (n = t.monsters.sort((e, r) => r.currentLevel - e.currentLevel)), 
    {
      monsters: n,
      items: a,
      player: t,
      totalRefCount: r
    };
  }
  async claimReferralReward(e) {
    var r, t, n, e = e.account._id || e.account, a = await this._getTotalReferral(e), e = await Player.findOne({
      account: e
    });
    if (e) return 0 == (r = a - (a = e.appliedReferralCount)) ? {
      unclaimedItemCount: 0,
      usedReferralCount: 0
    } : (t = (r = Math.floor(r / this.referralRewardPerClaimCount)) * this.referralRewardPerClaimCount, 
    (n = e.consumableItems.find(e => e.itemUniqueId === this.defaultReferralItemId)) ? n.quantity += r : (n = {
      itemUniqueId: this.defaultReferralItemId,
      item: new mongoose.Types.ObjectId(this.referralItemUniqueIdToId[this.defaultReferralItemId]),
      quantity: r
    }, e.consumableItems.push(n)), e.appliedReferralCount = a + t, await e.save(), 
    {
      unclaimedItemCount: r,
      usedReferralCount: t
    });
    throw new Error("Player not found");
  }
  async claimBonusReward({
    questId: e
  }, r) {
    var t = this.referralQuests[e] || this.summonQuests[e];
    if (!t) throw new Error("Quest not found");
    var n, a = r.account._id || r.accountId, a = await Player.findOne({
      account: a
    });
    if (!await this._canCompleteQuest({
      player: a,
      quest: t
    }, r)) throw new Error("Cannot complete quest");
    const i = t.reward;
    if ("farpoints" !== i.itemUniqueId) return (t = a.consumableItems.find(e => e.itemUniqueId === i.itemUniqueId)) ? t.quantity += i.quantity : (n = {
      itemUniqueId: i.itemUniqueId,
      item: new mongoose.Types.ObjectId(this.referralItemUniqueIdToId[i.itemUniqueId]),
      quantity: i.quantity
    }, a.consumableItems.push(n)), a.quests || (a.quests = {}), a.quests = {
      ...a.quests,
      [e]: !0
    }, await a.save(), {
      item: t
    };
    await this.scoreService.setScore({
      address: r.account.addresses[0].address,
      scoreType: this.freeScoreType,
      modifier: i.quantity
    });
  }
  async claimQuestReward({
    questId: e
  }, r) {
    if ("referral" === e) return this.claimReferralReward(r);
    if (this.referralQuests[e || this.summonQuests[e]]) return this.claimBonusReward({
      questId: e
    }, r);
    throw new Error("Quest not found");
  }
}

module.exports = {
  Service: FarcasterRpgService
};
const mongoose = require("mongoose"), schema = require("../schemas/accountInventory")["schema"], _CacheService = require("../services/cache/CacheService")["Service"];

class AccountInventoryClass {
  static ping() {
    console.log("model: AccountInventoryClass");
  }
  static async findAndSort({
    limit: e = 25,
    offset: t = 0,
    filters: r = {},
    sort: a = "-createdAt",
    countOnly: o = !1
  } = {}) {
    let s = {};
    r.account && (s = {
      ...s,
      account: new mongoose.Types.ObjectId(r.account)
    }), r.gtQuantity && (s = {
      ...s,
      quantity: {
        $gt: r.gtQuantity
      }
    }), r.rewardType && (s = "string" == typeof r.rewardType ? {
      ...s,
      rewardType: r.rewardType
    } : {
      ...s,
      rewardType: {
        $in: r.rewardType
      }
    });
    r = "-" === a[0] ? {
      [a.slice(1)]: -1,
      _id: 1
    } : {
      [a]: 1
    };
    return o ? (await this.aggregate([ {
      $match: s
    }, {
      $count: "count"
    } ]))?.[0]?.count || 0 : await this.aggregate([ {
      $match: s
    }, {
      $sort: r
    }, {
      $skip: parseInt(t, 10)
    }, {
      $limit: parseInt(e, 10)
    } ]);
  }
  static async createOrUpdate({
    rewardId: e,
    rewardType: t,
    quantity: r = 0,
    accountId: a,
    modifier: o = 0
  }) {
    if (!e || !a) throw new Error("Missing required parameters");
    var s = await this.findOne({
      rewardId: e,
      rewardType: t,
      account: a
    });
    let n = r;
    return o && (n = s?.quantity ? s.quantity + o : r + o), s ? (s.quantity = n, 
    s.save()) : await this.create({
      rewardId: e,
      rewardType: t,
      quantity: n,
      account: a
    });
  }
  static async getExtraInventory({
    address: e,
    fid: t,
    addCharacters: r,
    score: a
  }) {
    var o = [], e = await new _CacheService().get({
      key: "VerifiedInviteCode",
      params: {
        address: e
      }
    });
    return r && (o.push({
      background: "#BDE7FF",
      borderColor: "blue.50",
      src: "https://far.quest/layers/model-1.png",
      size: "128px",
      state: "claimed",
      name: "FarQuester",
      isCharacter: !0,
      modelName: "model-1",
      description: "This is your FarQuester. You can customize it with FarLoot!"
    }), o.push({
      background: "#BDE7FF",
      borderColor: "blue.50",
      src: "https://far.quest/layers/model-2.png",
      size: "128px",
      state: "claimed",
      name: "FarQuester",
      isCharacter: !0,
      modelName: "model-2",
      description: "This is your FarQuester. You can customize it with FarLoot!"
    })), e && o.push({
      background: "#BDE7FF",
      borderColor: "blue.50",
      src: "https://far.quest/loot/lilfarstray2x.png",
      size: "128px",
      state: "claimed",
      count: 1,
      name: "Lil' FarStray",
      description: "A FarStray, but lil! You earned this since you verified your Twitter or Farcaster account.",
      metadata: [ {
        key: "rarity",
        value: "legendary"
      } ]
    }), t && o.push({
      background: "#BDE7FF",
      borderColor: "blue.50",
      src: "https://far.quest/loot/fid.png",
      size: "128px",
      state: "claimed",
      count: 1,
      name: "FID:" + t,
      description: `Your Farcaster ID is ${t}. FIDs are a unique ID used throughout the
              Farcaster ecosystem. You can only register one FID per wallet.`
    }), 200 <= a && o.push({
      background: "#BDE7FF",
      borderColor: "blue.50",
      src: "https://far.quest/loot/cat2x.png",
      size: "128px",
      state: "claimed",
      count: 1,
      name: "Beb, FarStray",
      description: "A cute cat named Beb that meows and follows you around! You earned this since you reached 200 FarPoints."
    }), 500 <= a && o.push({
      background: "#BDE7FF",
      borderColor: "blue.50",
      src: "https://far.quest/loot/potion2x.png",
      size: "128px",
      state: "claimed",
      count: 1,
      name: "Potion",
      description: "This potion looks like a cool collectible! You earned this since you reached 500 FarPoints."
    }), 1e3 <= a && o.push({
      background: "#BDE7FF",
      borderColor: "blue.50",
      src: "https://far.quest/loot/fargate2x.png",
      size: "128px",
      state: "claimed",
      count: 1,
      name: "FarGate",
      description: "A portal to the metaverse. Maybe one day it will open... You earned this since you reached 1000 FarPoints."
    }), 1500 <= a && o.push({
      background: "#BDE7FF",
      borderColor: "blue.50",
      src: "https://far.quest/loot/witch2x.png",
      size: "128px",
      state: "claimed",
      count: 1,
      name: "FarWitch",
      description: "She is bound to charm you under her purple spell... You earned this since you reached 1500 FarPoints."
    }), 2e3 <= a && o.push({
      background: "#BDE7FF",
      borderColor: "blue.50",
      src: "https://far.quest/loot/wizard2x.png",
      size: "128px",
      state: "claimed",
      count: 1,
      name: "FarWizard",
      description: "You have reached the peak purpleness, but they will take you higher. You earned this since you reached 2000 FarPoints."
    }), 15e3 <= a && o.push({
      background: "#BDE7FF",
      borderColor: "blue.50",
      src: "https://far.quest/loot/farllama2x.png",
      size: "128px",
      state: "claimed",
      count: 1,
      name: "FarLlama",
      description: "A FarLlama is a as rare as its cousin Farlapaca. You earned this since you reached 15,000 FarPoints!"
    }), 5e4 <= a && o.push({
      background: "#BDE7FF",
      borderColor: "blue.50",
      src: "https://far.quest/loot/farpossum.png",
      size: "128px",
      state: "claimed",
      count: 1,
      name: "FarPossum",
      description: "FarPossum can be found in its native land of California, where far.quest's headquarter is. You earned this since you reached 50,000 FarPoints!"
    }), 15e4 <= a && o.push({
      background: "#BDE7FF",
      borderColor: "blue.50",
      src: "https://far.quest/loot/farlucky.png",
      size: "128px",
      state: "claimed",
      count: 1,
      name: "FarLucky",
      description: "With the blessing of FarLucky, who knows what you will receive? You earned this since you reached 150,000 FarPoints!"
    }), o.map(e => ({
      reward: {
        item: e,
        type: "IMAGE"
      },
      rewardId: null
    }));
  }
}

schema.loadClass(AccountInventoryClass);

const AccountInventory = mongoose.models.AccountInventory || mongoose.model("AccountInventory", schema);

module.exports = {
  AccountInventory: AccountInventory
};
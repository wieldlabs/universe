const mongoose = require("mongoose"), schema = require("../schemas/accountInventory")["schema"];

class AccountInventoryClass {
  static ping() {
    console.log("model: AccountInventoryClass");
  }
  static async findAndSort({
    limit: t = 25,
    offset: e = 0,
    filters: n = {},
    sort: a = "-createdAt",
    countOnly: r = !1
  } = {}) {
    let o = {};
    n.account && (o = {
      ...o,
      account: mongoose.Types.ObjectId(n.account)
    }), n.gtQuantity && (o = {
      ...o,
      quantity: {
        $gt: n.gtQuantity
      }
    }), n.rewardType && (o = "string" == typeof n.rewardType ? {
      ...o,
      rewardType: n.rewardType
    } : {
      ...o,
      rewardType: {
        $in: n.rewardType
      }
    });
    n = "-" === a[0] ? {
      [a.slice(1)]: -1,
      _id: 1
    } : {
      [a]: 1
    };
    return r ? (await this.aggregate([ {
      $match: o
    }, {
      $count: "count"
    } ]))?.[0]?.count || 0 : await this.aggregate([ {
      $match: o
    }, {
      $sort: n
    }, {
      $skip: parseInt(e, 10)
    }, {
      $limit: parseInt(t, 10)
    } ]);
  }
  static async createOrUpdate({
    rewardId: t,
    rewardType: e,
    quantity: n = 0,
    accountId: a,
    modifier: r = 0
  }) {
    if (!t || !a) throw new Error("Missing required parameters");
    var o = await this.findOne({
      rewardId: t,
      rewardType: e,
      account: a
    });
    let c = n;
    return r && (c = o?.quantity ? o.quantity + r : n + r), o ? (o.quantity = c, 
    o.save()) : await this.create({
      rewardId: t,
      rewardType: e,
      quantity: c,
      account: a
    });
  }
}

schema.loadClass(AccountInventoryClass);

const AccountInventory = mongoose.models.AccountInventory || mongoose.model("AccountInventory", schema);

module.exports = {
  AccountInventory: AccountInventory
};
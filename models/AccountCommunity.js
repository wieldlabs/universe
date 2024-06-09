const mongoose = require("mongoose"), schema = require("../schemas/accountCommunity")["schema"];

class AccountCommunityClass {
  static ping() {
    console.log("model: AccountCommunityClass");
  }
  static async _existingAccountCommunity({
    accountId: t,
    communityId: n
  }) {
    return t && n ? this.findOne({
      account: t,
      community: n
    }) : null;
  }
  static async updateOrCreate({
    accountId: t,
    communityId: n,
    ...o
  }) {
    var c = await this._existingAccountCommunity({
      accountId: t,
      communityId: n
    });
    return c ? (c.joined = !!o.joined, c.save()) : this.create({
      account: t,
      community: n,
      ...o
    });
  }
  static async findOrCreate({
    accountId: t,
    communityId: n,
    joined: o = !1
  }) {
    var c = await this._existingAccountCommunity({
      accountId: t,
      communityId: n
    });
    return c || this.create({
      account: t,
      community: n,
      joined: o
    });
  }
  static async findAndSort({
    limit: t = 25,
    offset: n = 0,
    filters: o = {},
    sort: c = "_id"
  } = {}) {
    let i = {};
    o.account && (i = {
      ...i,
      account: new mongoose.Types.ObjectId(o.account)
    }), o.community && (i = {
      ...i,
      community: new mongoose.Types.ObjectId(o.community)
    }), void 0 !== o.joined && (i = {
      ...i,
      joined: !!o.joined
    });
    o = "-" === c[0] ? {
      [c.slice(1)]: -1,
      _id: 1
    } : {
      [c]: 1
    };
    return await this.aggregate([ {
      $match: i
    }, {
      $sort: o
    }, {
      $skip: parseInt(n, 10)
    }, {
      $limit: parseInt(t, 10)
    } ]);
  }
  static async updateAccountCommunityLastSeen({
    accountId: t,
    communityId: n
  }) {
    t = await this._existingAccountCommunity({
      accountId: t,
      communityId: n
    });
    if (t) return t.lastSeen = new Date(), t.save();
    throw new Error("Invalid AccountCommunity");
  }
  static async updateAccountCommunityJoined({
    accountId: t,
    communityId: n,
    joined: o
  }) {
    t = await this._existingAccountCommunity({
      accountId: t,
      communityId: n
    });
    if (t) return t.joined = !!o, t.save();
    throw new Error("Invalid AccountCommunity");
  }
}

schema.loadClass(AccountCommunityClass);

const AccountCommunity = mongoose.models.AccountCommunity || mongoose.model("AccountCommunity", schema);

module.exports = {
  AccountCommunity: AccountCommunity
};
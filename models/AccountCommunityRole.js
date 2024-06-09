const mongoose = require("mongoose"), schema = require("../schemas/accountCommunityRole")["schema"];

class AccountCommunityRoleClass {
  static ping() {
    console.log("model: AccountCommunityRoleClass");
  }
  static async createOrUpdate({
    roleId: o,
    accountCommunityId: e,
    isManagedByIndexer: n,
    isValid: t
  }) {
    var i;
    if (o && e) return ((i = await AccountCommunityRole.findOne({
      role: o,
      accountCommunity: e
    })) ? (i.isValid = t, i.isManagedByIndexer = n, i) : new AccountCommunityRole({
      accountCommunity: new mongoose.Types.ObjectId(e),
      role: new mongoose.Types.ObjectId(o),
      isManagedByIndexer: !!n,
      isValid: t
    })).save();
    throw new Error("Missing required parameters");
  }
  static async findOrCreate({
    roleId: o,
    accountCommunityId: e,
    isManagedByIndexer: n,
    isValid: t
  }) {
    if (o && e) return await AccountCommunityRole.findOne({
      role: o,
      accountCommunity: e
    }) || new AccountCommunityRole({
      accountCommunity: new mongoose.Types.ObjectId(e),
      role: new mongoose.Types.ObjectId(o),
      isManagedByIndexer: !!n,
      isValid: t
    }).save();
    throw new Error("Missing required parameters");
  }
  static async findAndSort({
    limit: o = 20,
    offset: e = 0,
    filters: n = {},
    sort: t = "_id"
  } = {}) {
    let i = {};
    n.accountCommunity && (i = {
      ...i,
      accountCommunity: new mongoose.Types.ObjectId(n.accountCommunity)
    }), n.role && (i = {
      ...i,
      role: new mongoose.Types.ObjectId(n.role)
    }), void 0 !== n.isValid && (i = {
      ...i,
      isValid: !!n.isValid
    });
    n = "-" === t[0] ? {
      [t.slice(1)]: -1,
      _id: 1
    } : {
      [t]: 1
    };
    return this.aggregate([ {
      $match: i
    }, {
      $sort: n
    }, {
      $skip: parseInt(e, 10)
    }, {
      $limit: parseInt(o, 10)
    } ]);
  }
}

schema.loadClass(AccountCommunityRoleClass);

const AccountCommunityRole = mongoose.models.AccountCommunityRole || mongoose.model("AccountCommunityRole", schema);

module.exports = {
  AccountCommunityRole: AccountCommunityRole
};
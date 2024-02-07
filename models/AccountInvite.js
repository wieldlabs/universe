const mongoose = require("mongoose"), schema = require("../schemas/accountInvite")["schema"], crypto = require("crypto");

class AccountInviteClass {
  static ping() {
    console.log("model: AccountInviteClass");
  }
  static async findOrCreate({
    accountId: e,
    useCount: o,
    maxUseCount: t,
    expiresAt: c
  }) {
    var n = await this.findOne({
      account: e
    });
    return n || this.create({
      account: e,
      useCount: o,
      maxUseCount: t,
      expiresAt: c,
      code: "" + crypto.randomInt(1e7, 1e8)
    });
  }
}

schema.loadClass(AccountInviteClass);

const AccountInvite = mongoose.models.AccountInvite || mongoose.model("AccountInvite", schema);

module.exports = {
  AccountInvite: AccountInvite
};
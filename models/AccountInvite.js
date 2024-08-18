const mongoose = require("mongoose"), schema = require("../schemas/accountInvite")["schema"], crypto = require("crypto");

class AccountInviteClass {
  static ping() {
    console.log("model: AccountInviteClass");
  }
  static async findOrCreate({
    accountId: e,
    useCount: t,
    maxUseCount: o,
    expiresAt: c
  }) {
    var n = await this.findOne({
      account: e
    });
    return n || this.create({
      account: e,
      useCount: t,
      maxUseCount: o,
      expiresAt: c,
      code: crypto.randomBytes(7).toString("base64").replace(/[+/=]/g, "").replace(/[a-z]/gi, e => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[e.charCodeAt(0) % 36]).slice(0, 8)
    });
  }
}

schema.loadClass(AccountInviteClass);

const AccountInvite = mongoose.models.AccountInvite || mongoose.model("AccountInvite", schema);

module.exports = {
  AccountInvite: AccountInvite
};
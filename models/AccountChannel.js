const mongoose = require("mongoose"), schema = require("../schemas/accountChannel")["schema"];

class AccountChannelClass {
  static ping() {
    console.log("model: AccountChannelClass");
  }
  static async _existingAccountChannel({
    accountId: n,
    channelId: e
  }) {
    return n && e ? this.findOne({
      account: n,
      channel: e
    }) : null;
  }
  static async updateAccountChannelLastSeen({
    accountId: n,
    channelId: e
  }) {
    n = await this._existingAccountChannel({
      accountId: n,
      channelId: e
    });
    if (n) return n.userLastSeen = new Date(), n.save();
    throw new Error("Invalid AccountChannel");
  }
  static async findOrCreate({
    accountId: n,
    channelId: e,
    userLastSeen: c
  }) {
    var a = await this._existingAccountChannel({
      accountId: n,
      channelId: e
    });
    return a ? c ? (a.userLastSeen = c, a.save()) : a : this.create({
      account: n,
      channel: e,
      userLastSeen: c || new Date()
    });
  }
}

schema.loadClass(AccountChannelClass);

const AccountChannel = mongoose.models.AccountChannel || mongoose.model("AccountChannel", schema);

module.exports = {
  AccountChannel: AccountChannel
};
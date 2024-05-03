const mongoose = require("mongoose"), schema = require("../schemas/accountBookmarks")["schema"];

class AccountBookmarksClass {
  static ping() {
    console.log("model: AccountBookmarksClass");
  }
}

schema.loadClass(AccountBookmarksClass);

const AccountBookmarks = mongoose.models.AccountBookmarks || mongoose.model("AccountBookmarks", schema);

module.exports = {
  AccountBookmarks: AccountBookmarks
};
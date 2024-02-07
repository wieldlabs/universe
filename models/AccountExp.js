const mongoose = require("mongoose"), schema = require("../schemas/accountExp")["schema"];

class AccountExpClass {
  static ping() {
    console.log("model: AccountExpClass");
  }
}

schema.loadClass(AccountExpClass);

const AccountExp = mongoose.models.AccountExp || mongoose.model("AccountExp", schema);

module.exports = {
  AccountExp: AccountExp
};
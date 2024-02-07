const mongoose = require("mongoose"), schema = require("../schemas/accountAddress")["schema"];

class AccountAddressClass {
  static ping() {
    console.log("model: AccountAddressClass");
  }
}

schema.loadClass(AccountAddressClass);

const AccountAddress = mongoose.models.AccountAddress || mongoose.model("AccountAddress", schema);

module.exports = {
  AccountAddress: AccountAddress
};
const mongoose = require("mongoose"), schema = require("../../schemas/token/bondingERC20Transaction")["schema"];

class BondingErc20TransactionClass {
  static ping() {
    console.log("model: BondingErc20TransactionClass");
  }
}

schema.loadClass(BondingErc20TransactionClass);

const BondingErc20Transaction = mongoose.models.BondingErc20Transaction || mongoose.model("fartoken.BondingErc20Transaction", schema);

module.exports = {
  BondingErc20Transaction: BondingErc20Transaction
};
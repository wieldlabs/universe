const mongoose = require("mongoose"), schema = require("../../schemas/token/bondingERC20History")["schema"];

class BondingErc20HistoryClass {
  static ping() {
    console.log("model: BondingErc20HistoryClass");
  }
}

schema.loadClass(BondingErc20HistoryClass);

const BondingErc20History = mongoose.models.BondingErc20History || mongoose.model("fartoken.BondingErc20History", schema);

module.exports = {
  BondingErc20History: BondingErc20History
};
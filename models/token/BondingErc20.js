const mongoose = require("mongoose"), schema = require("../../schemas/token/bondingERC20")["schema"];

class BondingErc20Class {
  static ping() {
    console.log("model: BondingErc20Class");
  }
  static availableTokens() {
    process.env.NODE_ENV;
    return [ "FARTOKEN", "WOW" ];
  }
}

schema.loadClass(BondingErc20Class);

const BondingErc20 = mongoose.models.BondingErc20 || mongoose.model("fartoken.BondingErc20", schema);

module.exports = {
  BondingErc20: BondingErc20
};
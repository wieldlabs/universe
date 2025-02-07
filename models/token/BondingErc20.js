const mongoose = require("mongoose"), schema = require("../../schemas/token/bondingERC20")["schema"];

class BondingErc20Class {
  static ping() {
    console.log("model: BondingErc20Class");
  }
  static availableTokens() {
    return [ "FARTOKEN" ];
  }
  static queryTokens() {
    return [ "FARTOKEN" ];
  }
  static queryToken() {
    return "FARTOKEN";
  }
  static cleanSymbol(o) {
    return o && 1 < o.length && o.startsWith("$") ? o.slice(1) : o;
  }
}

schema.loadClass(BondingErc20Class);

const BondingErc20 = mongoose.models.BondingErc20 || mongoose.model("fartoken.BondingErc20", schema);

module.exports = {
  BondingErc20: BondingErc20
};
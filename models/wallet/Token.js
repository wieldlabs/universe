const tokenSchema = require("../../schemas/wallet/token")["schema"], mongoose = require("mongoose");

class TokenClass {
  static ping() {
    console.log("model: TokenClass");
  }
}

tokenSchema.loadClass(TokenClass);

const Token = mongoose.models.Token || mongoose.model("wallet.Token", tokenSchema);

module.exports = {
  Token: Token
};
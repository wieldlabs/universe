const mongoose = require("mongoose"), crypto = require("crypto"), ethers = require("ethers")["ethers"], recoverPersonalSignature = require("@metamask/eth-sig-util")["recoverPersonalSignature"], bufferToHex = require("ethereumjs-util")["bufferToHex"], getRandomUint256 = require("../helpers/get-random-uint256")["getRandomUint256"], schema = require("../schemas/accountNonce")["schema"];

class AccountNonceClass {
  static ping() {
    console.log("model: AccountNonceClass");
  }
  async getMessageToSign() {
    return `@wieldlabs/universe wants you to sign in with your Ethereum account, secured with a signed message:
 ${this.nonce.length} ` + this.nonce;
  }
  async decodeAddressBySignature(e) {
    var n = `@wieldlabs/universe wants you to sign in with your Ethereum account, secured with a signed message:
 ${this.nonce.length} ` + this.nonce, n = bufferToHex(Buffer.from(n, "utf8"));
    return recoverPersonalSignature({
      data: n,
      signature: e
    });
  }
  static async generateNewTransactionNonceByAccountId(e) {
    e = await this.findOne({
      account: e
    });
    if (e) return e.generateNewTransactionNonce(), e;
    throw new Error("Invalid account nonce");
  }
  async generateNewNonce() {
    this.nonce = "" + crypto.randomInt(1, 1e4), await this.save();
  }
  async generateNewTransactionNonce() {
    this.transactionNonce = "" + getRandomUint256(), await this.save();
  }
  get salt() {
    var e = ethers.utils.toUtf8Bytes(this._id), e = ethers.utils.keccak256(e);
    return ethers.BigNumber.from(e).toString();
  }
}

schema.loadClass(AccountNonceClass);

const AccountNonce = mongoose.models.AccountNonce || mongoose.model("AccountNonce", schema);

module.exports = {
  AccountNonce: AccountNonce
};
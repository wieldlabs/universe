const crypto = require("crypto"), ethers = require("ethers")["ethers"], getRandomUint256 = () => ethers.BigNumber.from(crypto.randomBytes(32)).toString();

module.exports = {
  getRandomUint256: getRandomUint256
};
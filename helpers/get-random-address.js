var ethers = require("ethers")["ethers"], crypto = require("crypto");

const getRandomAddress = () => {
  var e = crypto.randomBytes(32).toString("hex");
  return new ethers.Wallet("0x" + e).address;
};

module.exports = {
  getRandomAddress: getRandomAddress
};
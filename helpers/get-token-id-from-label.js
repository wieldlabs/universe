const ethers = require("ethers"), convertHexTokenIdToNumber = e => ethers.BigNumber.from(e).toString(), getTokenIdFromLabel = e => {
  return e ? (e = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(e)), ethers.BigNumber.from(e).toString()) : null;
}, getHexTokenIdFromLabel = e => {
  return e ? (e = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(e)), ethers.BigNumber.from(e).toHexString()) : null;
};

module.exports = {
  getTokenIdFromLabel: getTokenIdFromLabel,
  getHexTokenIdFromLabel: getHexTokenIdFromLabel,
  convertHexTokenIdToNumber: convertHexTokenIdToNumber
};
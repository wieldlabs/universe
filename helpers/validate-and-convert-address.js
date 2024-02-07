const ethers = require("ethers")["ethers"], crypto = require("crypto"), validatePemKey = r => {
  try {
    return crypto.createPublicKey(r), r;
  } catch (r) {
    throw new Error("Invalid PEM key");
  }
}, validateAndConvertAddress = (r, e = 1) => {
  if (!r) throw new Error("Invalid address");
  if (-7 == e) return validatePemKey(r);
  try {
    return ethers.utils.getAddress(r);
  } catch (r) {
    throw new Error(r.message);
  }
}, isAddress = r => {
  if (!r) return !1;
  try {
    return validateAndConvertAddress(r), !0;
  } catch (r) {
    return !1;
  }
}, isENS = r => {
  if (!r) return !1;
  try {
    return ".eth" === r?.slice?.(-4);
  } catch (r) {
    return !1;
  }
};

module.exports = {
  validateAndConvertAddress: validateAndConvertAddress,
  isAddress: isAddress,
  isENS: isENS
};
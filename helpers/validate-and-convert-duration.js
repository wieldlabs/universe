const ethers = require("ethers")["ethers"], Sentry = require("@sentry/node"), validateAndConvertDuration = r => {
  if (!r) throw new Error("Invalid duration");
  try {
    return ethers.BigNumber.from(r).toString();
  } catch (r) {
    throw Sentry.captureException(r), new Error(r.message);
  }
};

module.exports = {
  validateAndConvertDuration: validateAndConvertDuration
};
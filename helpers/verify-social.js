const axios = require("axios").default, axiosRetry = require("axios-retry").default, TIMEOUT = (axiosRetry(axios, {
  retries: 3
}), 1e4), verifyTwitter = async (e, r) => {
  return !!e;
};

module.exports = {
  verifyTwitter: verifyTwitter
};
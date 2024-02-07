const axios = require("axios").default, axiosRetry = require("axios-retry"), TIMEOUT = (axiosRetry(axios, {
  retries: 3
}), 1e4), verifyTwitter = async (e, t) => {
  return !!e && (e = (await axios.get("https://publish.twitter.com/oembed?url=" + e.replace("x.com", "twitter.com"), {
    timeout: TIMEOUT
  }))["data"], e.html.includes("@wieldlabs"));
};

module.exports = {
  verifyTwitter: verifyTwitter
};
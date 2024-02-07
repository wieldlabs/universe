const crypto = require("crypto"), generateChallenge = () => crypto.randomBytes(32).toString("base64");

module.exports = {
  generateChallenge: generateChallenge
};
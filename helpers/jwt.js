const jwt = require("jsonwebtoken"), generateNewAccessTokenFromAccount = (e, o = {}) => {
  if (e && e._id) return new Promise((r, n) => {
    jwt.sign({
      payload: {
        id: e._id,
        address: e.addresses[0].address,
        ...o
      }
    }, process.env.JWT_SECRET, {
      algorithm: "HS256"
    }, (e, o) => e ? n(e) : o ? r(o) : new Error("Empty token"));
  });
  throw new Error("Invalid Account");
}, getConfig = () => ({
  algorithms: [ "HS256" ],
  secret: process.env.JWT_SECRET
});

module.exports = {
  generateNewAccessTokenFromAccount: generateNewAccessTokenFromAccount,
  getConfig: getConfig
};
const jwt = require("jsonwebtoken"), getConfig = require("./jwt")["getConfig"], Account = require("../models/Account")["Account"], requireAuth = e => new Promise((t, u) => {
  jwt.verify(e, getConfig().secret, {
    ignoreExpiration: !0
  }, function(e, r) {
    return e ? u(e) : t(r);
  });
}), unauthorizedResponse = {
  code: "403",
  success: !1,
  message: "Unauthorized"
}, signedInAccountIdOrNull = (e = {}) => e.accountId || e.account?._id || null, unauthorizedErrorOrAccount = async (e, r, t) => {
  var u = t["accountId"];
  return u ? (u = await Account.findById(u), {
    code: "200",
    success: !0,
    account: t.account = u
  }) : unauthorizedResponse;
}, isAuthorizedToAccessResource = (e, r, t, u) => {
  var c = t.accountId || t.account?._id;
  if (!c) return !1;
  switch (u) {
   case "account":
    if (e?._id?.toString() === c.toString()) break;
    return !1;

   case "accountAddress":
   case "accountThread":
    if (e.account?.toString() !== c) return !1;
    break;

   default:
    if (e?._id?.toString() !== c.toString()) return !1;
  }
  return !0;
};

module.exports = {
  requireAuth: requireAuth,
  unauthorizedErrorOrAccount: unauthorizedErrorOrAccount,
  unauthorizedResponse: unauthorizedResponse,
  isAuthorizedToAccessResource: isAuthorizedToAccessResource,
  signedInAccountIdOrNull: signedInAccountIdOrNull
};
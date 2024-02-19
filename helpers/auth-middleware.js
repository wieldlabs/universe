const jwt = require("jsonwebtoken"), getConfig = require("./jwt")["getConfig"], Account = require("../models/Account")["Account"], requireAuth = e => {
  if (e && e.includes("Bearer ")) return new Promise((t, o) => {
    jwt.verify(e.slice(7), getConfig().secret, {
      ignoreExpiration: !0
    }, function(e, r) {
      return e ? o(e) : t(r);
    });
  });
  throw new Error("Bearer token not correctly provided");
}, unauthorizedResponse = {
  code: "403",
  success: !1,
  message: "Unauthorized"
}, signedInAccountIdOrNull = (e = {}) => e.accountId || e.account?._id || null, unauthorizedErrorOrAccount = async (e, r, t) => {
  var o = t["accountId"];
  return o ? (o = await Account.findById(o), {
    code: "200",
    success: !0,
    account: t.account = o
  }) : unauthorizedResponse;
}, isAuthorizedToAccessResource = (e, r, t, o) => {
  var n = t.accountId || t.account?._id;
  if (!n) return !1;
  switch (o) {
   case "account":
    if (e?._id?.toString() === n.toString()) break;
    return !1;

   case "accountAddress":
   case "accountThread":
    if (e.account?.toString() !== n) return !1;
    break;

   default:
    if (e?._id?.toString() !== n.toString()) return !1;
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
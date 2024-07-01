const _CacheService = require("../services/cache/CacheService")["Service"], validateAndConvertAddress = require("./validate-and-convert-address")["validateAndConvertAddress"], CacheService = new _CacheService(), REFERRAL_KEY = "ReferralService";

async function createReferral({
  referralCode: e,
  address: r,
  hash: a
}) {
  try {
    if (e && r && a) return await CacheService.set({
      key: REFERRAL_KEY,
      params: {
        address: validateAndConvertAddress(r)
      },
      value: e + ":" + a,
      expiresAt: new Date(Date.now() + 1296e5)
    }), {
      code: 200,
      success: !0
    };
    throw new Error("Missing required params");
  } catch (e) {
    throw new Error(e.message);
  }
}

module.exports = {
  createReferral: createReferral
};
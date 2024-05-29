const Sentry = require("@sentry/node"), rateLimit = require("express-rate-limit"), Account = require("../models/Account")["Account"], ApiKey = require("../models/ApiKey")["ApiKey"], requireAuth = require("../helpers/auth-middleware")["requireAuth"], {
  memcache,
  getHash
} = require("../connectmemcache"), apiKeyCache = new Map(), getLimit = o => async (e, t) => {
  var i, a = e.header("API-KEY");
  if (!a) return Sentry.captureMessage("Missing API-KEY header! Returning 0", {
    tags: {
      url: e.url
    }
  }), 0;
  let r;
  return apiKeyCache.has(a) ? r = apiKeyCache.get(a) : (i = await memcache.get(getHash("WalletApiKey_getLimit:" + a))) && (r = new ApiKey(JSON.parse(i.value)), 
  apiKeyCache.set(a, r)), r || (r = await ApiKey.findOne({
    key: a
  })) && (apiKeyCache.set(a, r), await memcache.set(getHash("WalletApiKey_getLimit:" + a), JSON.stringify(r), {
    lifetime: 3600
  })), r ? Math.ceil(o * r.multiplier) : (i = `API-KEY ${a} not found! Returning 0 for ` + e.url, 
  console.error(i), Sentry.captureMessage(i), 0);
}, limiter = rateLimit({
  windowMs: 3e3,
  max: getLimit(2.5),
  message: "Too many requests or invalid API key! See docs.far.quest for more info.",
  validate: {
    limit: !1
  }
}), heavyLimiter = rateLimit({
  windowMs: 2e3,
  max: getLimit(.3),
  message: "Too many requests or invalid API key! See docs.far.quest for more info.",
  validate: {
    limit: !1
  }
}), authContext = async (t, e, i) => {
  try {
    if (t.context && t.context.accountId) return i();
    var a = await requireAuth(t.headers.authorization || "");
    if (!a.payload.id) throw new Error("jwt must be provided");
    var r = await Account.findById(a.payload.id);
    if (!r) throw new Error(`Account id ${a.payload.id} not found`);
    if (r.deleted) throw new Error(`Account id ${a.payload.id} deleted`);
    t.context = {
      ...t.context || {},
      accountId: a.payload.id,
      account: r
    };
  } catch (e) {
    e.message.includes("jwt must be provided") || e.message.includes("jwt malformed") || (Sentry.captureException(e), 
    console.error(e)), t.context = {
      ...t.context || {},
      accountId: null,
      account: null
    };
  }
  i();
};

module.exports = {
  limiter: limiter,
  heavyLimiter: heavyLimiter,
  authContext: authContext
};
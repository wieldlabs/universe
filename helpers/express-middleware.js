const Sentry = require("@sentry/node"), rateLimit = require("express-rate-limit"), Account = require("../models/Account")["Account"], ApiKey = require("../models/ApiKey")["ApiKey"], requireAuth = require("../helpers/auth-middleware")["requireAuth"], {
  getMemcachedClient,
  getHash
} = require("../connectmemcached"), apiKeyCache = new Map(), getLimit = n => async (e, t) => {
  var i = e.header("API-KEY");
  if (!i) return r = "Missing API-KEY header! Returning 0 for " + e.url, Sentry.captureMessage(r), 
  0;
  var r = getMemcachedClient();
  let a;
  if (apiKeyCache.has(i)) a = apiKeyCache.get(i); else try {
    var o = await r.get(getHash("WalletApiKey_getLimit:" + i));
    o && (a = new ApiKey(JSON.parse(o.value)), apiKeyCache.set(i, a));
  } catch (e) {
    console.error(e);
  }
  if (!a && (a = await ApiKey.findOne({
    key: i
  }))) {
    apiKeyCache.set(i, a);
    try {
      await r.set(getHash("WalletApiKey_getLimit:" + i), JSON.stringify(a), {
        lifetime: 3600
      });
    } catch (e) {
      console.error(e);
    }
  }
  return a ? Math.ceil(n * a.multiplier) : (o = `API-KEY ${i} not found! Returning 0 for ` + e.url, 
  console.error(o), Sentry.captureMessage(o), 0);
}, limiter = rateLimit({
  windowMs: 3e3,
  max: getLimit(2.5),
  message: "Too many requests or invalid API key! See docs.wield.co for more info.",
  validate: {
    limit: !1
  }
}), heavyLimiter = rateLimit({
  windowMs: 2e3,
  max: getLimit(.3),
  message: "Too many requests or invalid API key! See docs.wield.co for more info.",
  validate: {
    limit: !1
  }
}), authContext = async (t, e, i) => {
  try {
    if (t.context && t.context.accountId) return i();
    var r = await requireAuth(t.headers.authorization?.slice(7) || "");
    if (!r.payload.id) throw new Error("jwt must be provided");
    var a = await Account.findById(r.payload.id);
    if (!a) throw new Error(`Account id ${r.payload.id} not found`);
    if (a.deleted) throw new Error(`Account id ${r.payload.id} deleted`);
    t.context = {
      ...t.context || {},
      accountId: r.payload.id,
      account: a
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
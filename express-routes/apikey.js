const app = require("express").Router(), Sentry = require("@sentry/node"), ApiKey = require("../models/ApiKey")["ApiKey"], {
  memcache,
  getHash
} = require("../connectmemcache"), rateLimit = require("express-rate-limit"), heavyLimiter = rateLimit({
  windowMs: 6e4,
  max: 1,
  message: "Too many requests! See docs.wield.xyz for more info.",
  validate: {
    limit: !1
  }
}), generateKey = () => {
  let r = "";
  var a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let e = 1; e <= 25; e++) {
    var t = Math.floor(Math.random() * a.length);
    r += a[t], e % 5 == 0 && e < 25 && (r += "-");
  }
  return r;
}, apiKeyCache = (app.post("/create", heavyLimiter, async (e, r) => {
  try {
    var a, {
      description: t,
      email: i
    } = e.body;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(i) ? !t || t.length < 5 ? r.json({
      code: "400",
      success: !1,
      message: "Description must be longer than 5 characters"
    }) : (a = await ApiKey.create({
      description: t,
      email: i,
      multiplier: 1,
      key: generateKey()
    }), Sentry.captureMessage(`New API key created for ${a.email} with ${a.description}! key=` + a.key), 
    r.json({
      code: "201",
      success: !0,
      message: "Successfully created API key!",
      key: a.key
    })) : r.json({
      code: "400",
      success: !1,
      message: "Invalid email address!"
    });
  } catch (e) {
    return Sentry.captureException(e), console.error(e), r.json({
      code: "500",
      success: !1,
      message: "Internal server error!"
    });
  }
}), new Map()), getLimit = s => async (e, r) => {
  var a, t = e.header("API-KEY");
  if (!t) return Sentry.captureMessage("Missing API-KEY header! Returning 0", {
    tags: {
      url: e.url
    }
  }), 0;
  let i;
  return apiKeyCache.has(t) ? i = apiKeyCache.get(t) : (a = await memcache.get(getHash("FarcasterApiKey_checkLimit:" + t))) && (i = new ApiKey(JSON.parse(a.value)), 
  apiKeyCache.set(t, i)), i || (i = await ApiKey.findOne({
    key: t
  })) && (apiKeyCache.set(t, i), await memcache.set(getHash("FarcasterApiKey_checkLimit:" + t), JSON.stringify(i), {
    lifetime: 3600
  })), i ? Math.ceil(s * i.multiplier) : (a = `API-KEY ${t} not found! Returning 0 for ` + e.url, 
  console.error(a), Sentry.captureMessage(a), 0);
};

module.exports = {
  router: app,
  getLimit: getLimit
};
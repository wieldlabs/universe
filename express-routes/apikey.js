const app = require("express").Router(), Sentry = require("@sentry/node"), ApiKey = require("../models/ApiKey")["ApiKey"], rateLimit = require("express-rate-limit"), heavyLimiter = rateLimit({
  windowMs: 6e4,
  max: 1,
  message: "Too many requests! See docs.wield.co for more info.",
  validate: {
    limit: !1
  }
}), generateKey = () => {
  let r = "";
  var s = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let e = 1; e <= 25; e++) {
    var t = Math.floor(Math.random() * s.length);
    r += s[t], e % 5 == 0 && e < 25 && (r += "-");
  }
  return r;
};

app.post("/create", heavyLimiter, async (e, r) => {
  try {
    var s, {
      description: t,
      email: a
    } = e.body;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(a) ? !t || t.length < 5 ? r.json({
      code: "400",
      success: !1,
      message: "Description must be longer than 5 characters"
    }) : (s = await ApiKey.create({
      description: t,
      email: a,
      multiplier: 1,
      key: generateKey()
    }), Sentry.captureMessage(`New API key created for ${s.email} with ${s.description}! key=` + s.key), 
    r.json({
      code: "201",
      success: !0,
      message: "Successfully created API key!",
      key: s.key
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
}), module.exports = {
  router: app
};
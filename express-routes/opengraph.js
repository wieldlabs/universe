const app = require("express").Router(), rateLimit = require("express-rate-limit"), getHtml = require("../helpers/opengraph")["getHtml"], lightLimiter = rateLimit({
  windowMs: 1e3,
  max: 1e3,
  message: "Too many requests, please try again later.",
  handler: (e, t, r) => {
    t.status(429).send("Too many requests, please try again later.");
  }
});

app.get("/fetch", lightLimiter, async (e, t) => {
  try {
    var r = decodeURIComponent(e.query.url), s = await getHtml(r);
    t.send(s);
  } catch (e) {
    return t.json({
      code: "500",
      success: !1,
      message: e.message
    });
  }
}), module.exports = {
  router: app
};
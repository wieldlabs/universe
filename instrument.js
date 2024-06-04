const Sentry = require("@sentry/node"), dotenv = require("dotenv");

dotenv.config(), process.env.SENTRY_DSN && Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: "production" === process.env.NODE_ENV ? .001 : .01
});
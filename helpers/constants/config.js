const dev = () => ({
  DEFAULT_URI: "http://localhost:8080",
  FARQUEST_URI: "http://localhost:1234"
}), prod = () => ({
  DEFAULT_URI: "https://build.far.quest",
  FARQUEST_URI: "https://far.quest"
}), config = "production" === process.env.NODE_ENV ? prod : dev;

module.exports = {
  config: config,
  prod: prod,
  dev: dev
};
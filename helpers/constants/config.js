const dev = () => ({
  DEFAULT_URI: "http://localhost:8080"
}), prod = () => ({
  DEFAULT_URI: "https://protocol.wield.co"
}), config = "production" === process.env.NODE_ENV ? prod : dev;

module.exports = {
  config: config,
  prod: prod,
  dev: dev
};
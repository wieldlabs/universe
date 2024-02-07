const dev = {
  COOKIE_DOMAIN: ".localhost",
  URL_PREFIX: "http://",
  URL_SUFFIX: ":3000"
}, prod = {
  COOKIE_DOMAIN: ".wield.co",
  URL_PREFIX: "https://",
  URL_SUFFIX: ""
}, config = "production" === process.env.NODE_ENV ? prod : dev, makeSubdomainLinks = ({
  subdomain: o,
  path: i
}) => o ? config.URL_PREFIX + o + config.COOKIE_DOMAIN + config.URL_SUFFIX + i : "" + config.URL_PREFIX + config.COOKIE_DOMAIN.slice(1) + config.URL_SUFFIX + i;

module.exports = {
  makeSubdomainLinks: makeSubdomainLinks
};
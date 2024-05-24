const dev = () => ({
  DEFAULT_URI: "http://localhost:8080",
  FARQUEST_URI: "http://localhost:1234",
  FARSCHOOL_SEASON: 5,
  FARSCHOOL_COMMUNITY_ID: "624c126859c12863ac63f207",
  FARSCHOOL_START_DATE: "2024-05-19"
}), prod = () => ({
  DEFAULT_URI: "https://build.far.quest",
  FARQUEST_URI: "https://far.quest",
  FARSCHOOL_SEASON: 5,
  FARSCHOOL_COMMUNITY_ID: "624cfe6f425b63d4bb16923e",
  FARSCHOOL_START_DATE: "2024-05-19"
}), config = "production" === process.env.NODE_ENV ? prod : dev;

module.exports = {
  config: config,
  prod: prod,
  dev: dev
};
const constants = require("../../services/constants/aa"), prod = () => ({
  API_KEY: process.env.OPT_GOERLI_API_KEY,
  DEFAULT_URI: "http://localhost:8080/graphql",
  NODE_NETWORK: "opt-goerli",
  CHAIN_ID: 420,
  FACTORY_CONTRACT_ADDRESS: constants.factoryContractAddress,
  FACTORY_ABI: constants.FactoryContractJson.abi
}), dev = () => ({
  API_KEY: process.env.OPT_GOERLI_API_KEY,
  DEFAULT_URI: "https://protocol.wield.xyz/graphql",
  NODE_NETWORK: "opt-goerli",
  CHAIN_ID: 420,
  FACTORY_CONTRACT_ADDRESS: constants.factoryContractAddress,
  FACTORY_ABI: constants.FactoryContractJson.abi
}), config = "production" === process.env.NODE_ENV ? prod : dev;

module.exports = {
  config: config,
  prod: prod,
  dev: dev
};
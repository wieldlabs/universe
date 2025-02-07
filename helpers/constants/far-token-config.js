const farTokenFactoryABI = require("../abi/farTokenFactory")["farTokenFactoryABI"], farTokenConfig = {
  CHAIN_ID: 8453,
  FACTORY_ADDRESS: "0x5c4743942072d2d0772b9887770e0943a67af6b4",
  DEFAULT_REFERRER: "0x79F6D03D54dCfF1081988f2F886BB235493742F1",
  FACTORY_ABI: farTokenFactoryABI
};

module.exports = {
  farTokenConfig: farTokenConfig
};
const farTokenFactoryABI = require("../abi/farTokenFactory")["farTokenFactoryABI"], faragentTipFactoryABI = require("../abi/faragentTipFactory")["faragentTipFactoryABI"], farTokenConfig = {
  CHAIN_ID: 8453,
  FACTORY_ADDRESS: "0x5c4743942072d2d0772b9887770e0943a67af6b4",
  TIP_WRAPPER_FACTORY_ADDRESS: "0x6cb44592b4fc8bc384735c5132506cdd6e97ce64",
  DEFAULT_REFERRER: "0x79F6D03D54dCfF1081988f2F886BB235493742F1",
  FACTORY_ABI: farTokenFactoryABI,
  TIP_WRAPPER_ABI: faragentTipFactoryABI
};

module.exports = {
  farTokenConfig: farTokenConfig
};
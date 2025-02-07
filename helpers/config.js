const ProxyRegister2Contract = require("./abi/proxy-register-2.json"), OpControllerContract = require("./abi/op-controller-abi.json"), BulkRegisterContract = require("./abi/bulk-register-abi.json"), dev = () => ({
  FID_ADDRESS_2: "0x00000000fc6c5f01fc30151999387bb99a9f489b",
  ID_GATEWAY_ADDRESS: "0x00000000fc25870c6ed6b6c7e41fb078b7656f69",
  PROXY_REGISTER_2_ADDRESS: "0xf2a541b200ce09591fce7f9b7ec4a2c12ffc3824",
  PROXY_REGISTER_2_ABI: ProxyRegister2Contract.abi,
  ETH_NODE_URL: process.env.HOMESTEAD_NODE_URL,
  OPTIMISM_NODE_URL: process.env.OPTIMISM_NODE_URL,
  BASE_NODE_URL: process.env.BASE_NODE_URL,
  CONTROLLER_ADDRESS: "0x8357b8b211a02d8d0d2e1d947f7a4898cfc5af41",
  CONTROLLER_ADDRESS_OP: "0x8db531fe6bea7b474c7735879e9a1000e819bd1d",
  CONTROLLER_ADDRESS_BASE: "0xdd7672abb72542fd30307159bd898a273b1a14af",
  CONTROLLER_ABI: OpControllerContract.abi,
  BULK_REGISTER_ADDRESS_OP: "0x87fbbe36337fb3b92bcfa61cf0d70672d1c9c2f1",
  BULK_REGISTER_ADDRESS: "0x26ec4a18080303afe65628c205877c808e16caed",
  BULK_REGISTER_ADDRESS_BASE: "0x26e7923767d4a82b152f6998f604624bfde5b1be",
  BULK_REGISTER_ABI: BulkRegisterContract.abi
}), prod = () => ({
  FID_ADDRESS_2: "0x00000000fc6c5f01fc30151999387bb99a9f489b",
  ID_GATEWAY_ADDRESS: "0x00000000fc25870c6ed6b6c7e41fb078b7656f69",
  PROXY_REGISTER_2_ADDRESS: "0xf2a541b200ce09591fce7f9b7ec4a2c12ffc3824",
  PROXY_REGISTER_2_ABI: ProxyRegister2Contract.abi,
  OPTIMISM_NODE_URL: process.env.OPTIMISM_NODE_URL,
  ETH_NODE_URL: process.env.HOMESTEAD_NODE_URL,
  BASE_NODE_URL: process.env.BASE_NODE_URL,
  CONTROLLER_ADDRESS: "0x8357b8b211a02d8d0d2e1d947f7a4898cfc5af41",
  CONTROLLER_ADDRESS_OP: "0x8db531fe6bea7b474c7735879e9a1000e819bd1d",
  CONTROLLER_ADDRESS_BASE: "0xdd7672abb72542fd30307159bd898a273b1a14af",
  CONTROLLER_ABI: OpControllerContract.abi,
  BULK_REGISTER_ADDRESS_OP: "0x87fbbe36337fb3b92bcfa61cf0d70672d1c9c2f1",
  BULK_REGISTER_ADDRESS_BASE: "0x26e7923767d4a82b152f6998f604624bfde5b1be",
  BULK_REGISTER_ADDRESS: "0x26ec4a18080303afe65628c205877c808e16caed",
  BULK_REGISTER_ABI: BulkRegisterContract.abi
}), config = "production" === process.env.NODE_ENV ? prod : dev;

module.exports = {
  config: config,
  prod: prod,
  dev: dev
};
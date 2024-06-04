const config = require("../helpers/config")["config"], ethers = require("ethers"), generateUsername = require("friendly-username-generator")["generateUsername"], validateAndCreateMetadata = require("./domain-metadata")["validateAndCreateMetadata"], getTxDataForProxyRegister2Address = async e => {
  var t = e.query["args"];
  try {
    var r, a = new ethers.providers.AlchemyProvider(10, config().OPTIMISM_NODE_URL), n = await new ethers.Contract(config().PROXY_REGISTER_2_ADDRESS, config().PROXY_REGISTER_2_ABI, a).price(0), o = Math.floor(Date.now() / 1e3) + 604800, i = "0x" + (e.context.frameData?.frameActionBody?.address).toString("hex"), s = i, d = JSON.parse?.(t)?.signature;
    if (d && i) return r = new ethers.utils.Interface(config().PROXY_REGISTER_2_ABI).encodeFunctionData("proxiedRegister", [ i, s, o, d ]), 
    {
      chainId: "eip155:10",
      method: "eth_sendTransaction",
      attribution: !1,
      params: {
        abi: config().PROXY_REGISTER_2_ABI,
        to: config().PROXY_REGISTER_2_ADDRESS,
        data: r,
        value: n.toString()
      }
    };
    throw new Error("No signature or address provided");
  } catch (e) {
    throw console.error("Error fetching tx data for contract"), e;
  }
}, getTxDataForEthController = async e => {
  var t = new ethers.providers.AlchemyProvider(1, config().ETH_NODE_URL), t = new ethers.Contract(config().CONTROLLER_ADDRESS, config().CONTROLLER_ABI, t);
  let r = e.query.bebdomain || e.context?.untrustedData?.inputText;
  r = (r = r || generateUsername({
    useRandomNumber: !0
  })).replace(".cast", "");
  try {
    await validateAndCreateMetadata(r);
  } catch (e) {
    throw new Error("Invalid domain name: " + e.message);
  }
  var e = e.context.frameData?.frameActionBody?.address, e = "0x" + Buffer.from(e).toString("hex"), a = 31536e3, t = await t.rentPrice(r, a), e = new ethers.utils.Interface(config().CONTROLLER_ABI).encodeFunctionData("register", [ r, e, a ]);
  return {
    chainId: "eip155:1",
    method: "eth_sendTransaction",
    attribution: !1,
    params: {
      abi: config().CONTROLLER_ABI,
      to: config().CONTROLLER_ADDRESS_OP,
      data: e,
      value: t.base.toString()
    }
  };
}, getTxDataForOpController = async e => {
  var t = 31536e4, r = new ethers.providers.AlchemyProvider(10, config().OPTIMISM_NODE_URL), r = new ethers.Contract(config().CONTROLLER_ADDRESS_OP, config().CONTROLLER_ABI, r);
  let a = e.query.bebdomain || e.context?.untrustedData?.inputText;
  if (!a) for (a = generateUsername({
    useRandomNumber: !0
  }); !a || a.length < 10; ) a = generateUsername({
    useRandomNumber: !0
  });
  a = (a = a.startsWith("op_") ? a : "op_" + a).replace(".cast", "");
  try {
    await validateAndCreateMetadata(a);
  } catch (e) {
    throw new Error("Invalid domain name: " + e.message);
  }
  e = e.context.frameData?.frameActionBody?.address, e = "0x" + Buffer.from(e).toString("hex"), 
  r = await r.rentPrice(a, t), t = new ethers.utils.Interface(config().CONTROLLER_ABI).encodeFunctionData("register", [ a, e, 31536e4 ]);
  return {
    chainId: "eip155:10",
    method: "eth_sendTransaction",
    attribution: !1,
    params: {
      abi: config().CONTROLLER_ABI,
      to: config().CONTROLLER_ADDRESS_OP,
      data: t,
      value: r.base.toString()
    }
  };
}, getBebdomainTxData = async e => {
  var t = e.query.bebdomain || e.context?.untrustedData?.inputText;
  return (t && t.length < 7 ? getTxDataForEthController : getTxDataForOpController)(e);
};

module.exports = {
  getTxDataForProxyRegister2Address: getTxDataForProxyRegister2Address,
  getTxDataForOpController: getTxDataForOpController,
  getTxDataForEthController: getTxDataForEthController,
  getBebdomainTxData: getBebdomainTxData
};
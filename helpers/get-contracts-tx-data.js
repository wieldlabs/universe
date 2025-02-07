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
}, makeBufferedRegistrationCost = (e, t) => {
  e = ethers.BigNumber.from(e || 0), t = ethers.BigNumber.from(t || 0), e = e.add(t), 
  t = e.div(100);
  return e.add(t).toString();
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
  var a = e.context?.frameData?.frameActionBody?.address, a = a ? "0x" + Buffer.from(a).toString("hex") : e.query.address, e = 31536e3, t = await t.rentPrice(r, e), a = new ethers.utils.Interface(config().CONTROLLER_ABI).encodeFunctionData("register", [ r, a, e ]);
  return {
    chainId: "eip155:1",
    method: "eth_sendTransaction",
    attribution: !1,
    params: {
      abi: config().CONTROLLER_ABI,
      to: config().CONTROLLER_ADDRESS,
      data: a,
      value: makeBufferedRegistrationCost(t.base, t.premium)
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
  var n = e.context?.frameData?.frameActionBody?.address, n = n ? "0x" + Buffer.from(n).toString("hex") : e.query.address, e = await r.rentPrice(a, t), r = new ethers.utils.Interface(config().CONTROLLER_ABI).encodeFunctionData("register", [ a, n, 31536e4 ]);
  return {
    chainId: "eip155:10",
    method: "eth_sendTransaction",
    attribution: !1,
    params: {
      abi: config().CONTROLLER_ABI,
      to: config().CONTROLLER_ADDRESS_OP,
      data: r,
      value: e.base.toString()
    }
  };
}, getTxDataForBaseController = async e => {
  var t = 31536e4, r = new ethers.providers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/" + config().BASE_NODE_URL, {
    name: "base",
    chainId: 8453
  }), r = new ethers.Contract(config().CONTROLLER_ADDRESS_BASE, config().CONTROLLER_ABI, r);
  let a = e.query.bebdomain || e.context?.untrustedData?.inputText;
  if (!a) for (a = generateUsername({
    useRandomNumber: !0
  }); !a || a.length < 10; ) a = generateUsername({
    useRandomNumber: !0
  });
  a = (a = a.startsWith("base_") ? a : "base_" + a).replace(".cast", "");
  try {
    await validateAndCreateMetadata(a);
  } catch (e) {
    throw new Error("Invalid domain name: " + e.message);
  }
  var n = e.context?.frameData?.frameActionBody?.address, n = n ? "0x" + Buffer.from(n).toString("hex") : e.query.address, e = await r.rentPrice(a, t), r = new ethers.utils.Interface(config().CONTROLLER_ABI).encodeFunctionData("register", [ a, n, 31536e4 ]);
  return {
    chainId: "eip155:8453",
    method: "eth_sendTransaction",
    attribution: !1,
    params: {
      abi: config().CONTROLLER_ABI,
      to: config().CONTROLLER_ADDRESS_BASE,
      data: r,
      value: e.base.toString()
    }
  };
}, getTxDataForBulkRegister = async e => {
  var {
    names: t,
    durations: r,
    chainId: a
  } = e.query;
  if (!t || !r) throw new Error("Missing required parameters: names, owners, or durations");
  t = t.split(","), r = r.split(",").map(e => parseInt(e));
  if (t.length !== r.length) throw new Error("Input arrays must have the same length");
  var n = e.context?.frameData?.frameActionBody?.address;
  const o = n ? "0x" + Buffer.from(n).toString("hex") : e.query.address;
  var n = new ethers.providers.AlchemyProvider("10" === a ? 10 : "8453" === a ? 8453 : 1, "10" === a ? config().OPTIMISM_NODE_URL : "8453" === a ? config().BASE_NODE_URL : config().ETH_NODE_URL), e = "10" === a ? config().BULK_REGISTER_ADDRESS_OP : "8453" === a ? config().BULK_REGISTER_ADDRESS_BASE : config().BULK_REGISTER_ADDRESS, i = config().BULK_REGISTER_ABI, n = await new ethers.Contract(e, i, n).calculateTotalPrice(t, r);
  return {
    chainId: "10" === a ? "eip155:10" : "8453" === a ? "eip155:8453" : "eip155:1",
    method: "eth_sendTransaction",
    attribution: !1,
    params: {
      abi: i,
      to: e,
      data: new ethers.utils.Interface(i).encodeFunctionData("bulkRegister", [ t, t.map(() => o), r ]),
      value: makeBufferedRegistrationCost(n, 0)
    }
  };
}, getBebdomainTxData = async e => {
  var t = e.query.bebdomain || e.context?.untrustedData?.inputText, r = e.query.chainId, a = e.query.count;
  return (a && 1 < parseInt(a) ? getTxDataForBulkRegister : "8453" === r ? getTxDataForBaseController : "1" === r || t && t.length < 7 ? getTxDataForEthController : getTxDataForOpController)(e);
};

module.exports = {
  getTxDataForProxyRegister2Address: getTxDataForProxyRegister2Address,
  getTxDataForOpController: getTxDataForOpController,
  getTxDataForEthController: getTxDataForEthController,
  getBebdomainTxData: getBebdomainTxData,
  getTxDataForBulkRegister: getTxDataForBulkRegister
};
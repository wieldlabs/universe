const getProvider = require("./alchemy-provider")["getProvider"], validateAndConvertAddress = require("./validate-and-convert-address")["validateAndConvertAddress"], getAddressFromEnsOrAddress = async e => {
  if (!e) throw new Error("Invalid ens or address");
  var r = "eth" === e.slice(-3), d = getProvider({
    network: "homestead",
    node: process.env.HOMESTEAD_NODE_URL
  });
  let s = e;
  return r && (s = await d.resolveName(e)), validateAndConvertAddress(s);
};

module.exports = {
  getAddressFromEnsOrAddress: getAddressFromEnsOrAddress
};
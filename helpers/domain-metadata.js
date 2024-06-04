const validateName = require("../helpers/validate-community-name")["validateName"], keccak256 = require("web3-utils").keccak256, utf8ToHex = require("web3-utils").utf8ToHex, Metadata = require("../models/Metadata")["Metadata"];

async function validateAndCreateMetadata(a) {
  if (!a || 0 == a.length || a.toLowerCase() != a) throw Error("inputDomain invalid!");
  if (a.includes(".beb") || a.includes(".cast")) {
    if (2 != a.split(".").length) throw Error("inputDomain cannot contain subdomains!");
    let e;
    if (a.includes(".beb") ? e = a.split(".beb") : a.includes(".cast") && (e = a.split(".cast")), 
    0 < e[1].length) throw Error("inputDomain extension incorrect!");
  } else if (a.includes(".")) throw Error("inputDomain does not have correct extension!");
  validateName(a);
  var a = a.replace(".beb", "").replace(".cast", ""), e = await Metadata.findOne({
    uri: keccak256(utf8ToHex(a))
  });
  return e ? {
    created: !1,
    domain: e.domain,
    uri: e.uri
  } : {
    created: !0,
    domain: (e = await Metadata.create({
      domain: a,
      uri: keccak256(utf8ToHex(a))
    })).domain,
    uri: e.uri
  };
}

module.exports = {
  validateAndCreateMetadata: validateAndCreateMetadata
};
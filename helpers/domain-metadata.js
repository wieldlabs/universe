const validateName = require("../helpers/validate-community-name")["validateName"], keccak256 = require("web3-utils").keccak256, utf8ToHex = require("web3-utils").utf8ToHex, Metadata = require("../models/Metadata")["Metadata"], CastHandle = require("../models/CastHandle")["CastHandle"], Sentry = require("@sentry/node");

async function validateAndCreateMetadata(a) {
  if (!a || 0 == a.length || a.toLowerCase() != a) throw Error("inputDomain invalid!");
  if (a.includes(".beb") || a.includes(".cast")) {
    if (2 != a.split(".").length) throw Error("inputDomain cannot contain subdomains!");
    let e;
    if (a.includes(".beb") ? e = a.split(".beb") : a.includes(".cast") && (e = a.split(".cast")), 
    0 < e[1].length) throw Error("inputDomain extension incorrect!");
  } else if (a.includes(".")) throw Error("inputDomain does not have correct extension!");
  validateName(a);
  var a = a.replace(".beb", "").replace(".cast", ""), e = keccak256(utf8ToHex(a)), t = await Metadata.findOne({
    uri: e
  });
  if (t) return {
    created: !1,
    domain: t.domain,
    uri: t.uri
  };
  t = await Metadata.create({
    domain: a,
    uri: e
  });
  try {
    var r = await CastHandle.findOne({
      tokenId: e
    });
    r && r.handle?.startsWith("0x") && (r.handle = a, await r.save());
  } catch (e) {
    Sentry.captureException(e), console.error("Error updating cast handle", e);
  }
  return {
    created: !0,
    domain: t.domain,
    uri: t.uri
  };
}

module.exports = {
  validateAndCreateMetadata: validateAndCreateMetadata
};
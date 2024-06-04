const namehash = require("@ensdomains/eth-ens-namehash"), validation = require("@ensdomains/ens-validation");

function isEncodedLabelhash(a) {
  return a.startsWith("[") && a.endsWith("]") && 66 === a.length;
}

const validRegex = new RegExp("^[a-z0-9-]+$");

function validateName(a) {
  var e = a.startsWith("op_") ? "op_" : "", a = a.replaceAll("op_", "").split(".");
  if (a.some(a => 0 == a.length)) throw new Error("Domain cannot have empty labels");
  let n;
  try {
    n = a.map(a => "[root]" === a || isEncodedLabelhash(a) ? a : namehash.normalize(a));
  } catch (a) {
    throw new Error("Domain cannot have invalid characters excluding prefix, valid=(a-z0-9-)");
  }
  a = n.join(".").toLowerCase();
  if (!validation.validate(a)) throw new Error("Domain cannot have invalid characters");
  if (validRegex.test(a.replace(".beb", "").replace(".cast", ""))) return e + a;
  throw new Error("Domain cannot have invalid characters excluding prefix, valid=(a-z0-9-)");
}

module.exports = {
  validateName: validateName
};
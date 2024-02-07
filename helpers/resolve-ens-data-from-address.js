const getProvider = require("./alchemy-provider")["getProvider"], validateAndConvertAddress = require("./validate-and-convert-address")["validateAndConvertAddress"], Sentry = require("@sentry/node"), resolveEnsFromAddress = async e => {
  if (!e) throw new Error("Invalid address");
  var r = getProvider({
    network: "homestead",
    node: process.env.HOMESTEAD_NODE_URL
  });
  try {
    var t = validateAndConvertAddress(e);
    return await r.lookupAddress(t);
  } catch (e) {
    return null;
  }
}, resolveEnsDataFromAddress = async e => {
  if (!e) throw new Error("Invalid ens or address");
  var r = getProvider({
    network: "homestead",
    node: process.env.HOMESTEAD_NODE_URL
  });
  let t;
  if ("eth" === e.slice(-3)) t = e; else {
    e = validateAndConvertAddress(e);
    try {
      t = await r.lookupAddress(e);
    } catch (e) {
      return Sentry.captureException(e), console.error(e), {
        ens: null,
        avatar: null,
        twitter: null,
        content: null
      };
    }
  }
  var e = await r.getResolver(t), r = await e.getText("com.twitter"), s = await e.getAvatar(), e = await e.getContentHash();
  return {
    ens: t,
    avatar: s,
    avatarUrl: s?.url || null,
    twitter: r,
    content: e
  };
};

module.exports = {
  resolveEnsDataFromAddress: resolveEnsDataFromAddress,
  resolveEnsFromAddress: resolveEnsFromAddress
};
const flagsDev = () => ({
  USE_GATEWAYS: !0
}), flagsProd = () => ({
  USE_GATEWAYS: !0
}), getFlags = () => ("production" === process.env.NODE_ENV ? flagsProd : flagsDev)();

module.exports = {
  flagsDev: flagsDev,
  flagsProd: flagsProd,
  getFlags: getFlags
};
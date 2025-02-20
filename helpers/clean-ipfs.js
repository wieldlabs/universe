const cleanIpfsImage = e => {
  return e?.startsWith("ipfs://") ? "https://wieldcd.net/cdn-cgi/image/fit=contain,f=auto,w=256/" + encodeURIComponent(e.replace("ipfs://", "https://pinata.wieldcd.net/ipfs/") + ("?pinataGatewayToken=" + process.env.PINATA_GATEWAY_TOKEN)) : e;
};

module.exports = {
  cleanIpfsImage: cleanIpfsImage
};
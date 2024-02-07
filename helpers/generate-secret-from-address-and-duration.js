const ethers = require("ethers"), generateSecretFromAddressAndDuration = ({
  address: e,
  duration: r,
  bebdomain: s
}) => {
  if (e && r) return ethers.utils.solidityKeccak256([ "address", "uint256", "string", "string" ], [ e, ethers.BigNumber.from(r), s, process.env.JWT_SECRET ]);
  throw new Error("Invalid address or duration");
};

module.exports = {
  generateSecretFromAddressAndDuration: generateSecretFromAddressAndDuration
};
const ethers = require("ethers")["ethers"], getMessageHash = (e, s, t, r) => {
  e = ethers.utils.solidityKeccak256([ "address", "uint256", "uint256", "address" ], [ e, s, t, r ]);
  return ethers.utils.arrayify(e);
};

module.exports = {
  getMessageHash: getMessageHash
};
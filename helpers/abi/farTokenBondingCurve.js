const farTokenBondingCurveABI = [ {
  inputs: [],
  stateMutability: "nonpayable",
  type: "constructor"
}, {
  inputs: [],
  name: "InsufficientLiquidity",
  type: "error"
}, {
  inputs: [],
  name: "B",
  outputs: [ {
    internalType: "uint256",
    name: "",
    type: "uint256"
  } ],
  stateMutability: "view",
  type: "function"
}, {
  inputs: [ {
    internalType: "uint256",
    name: "currentSupply",
    type: "uint256"
  }, {
    internalType: "uint256",
    name: "allocatedSupply",
    type: "uint256"
  }, {
    internalType: "uint256",
    name: "ethOrderSize",
    type: "uint256"
  }, {
    internalType: "uint256",
    name: "desiredRaise",
    type: "uint256"
  } ],
  name: "getEthBuyQuote",
  outputs: [ {
    internalType: "uint256",
    name: "",
    type: "uint256"
  } ],
  stateMutability: "view",
  type: "function"
}, {
  inputs: [ {
    internalType: "uint256",
    name: "currentSupply",
    type: "uint256"
  }, {
    internalType: "uint256",
    name: "allocatedSupply",
    type: "uint256"
  }, {
    internalType: "uint256",
    name: "ethOrderSize",
    type: "uint256"
  }, {
    internalType: "uint256",
    name: "desiredRaise",
    type: "uint256"
  } ],
  name: "getEthSellQuote",
  outputs: [ {
    internalType: "uint256",
    name: "",
    type: "uint256"
  } ],
  stateMutability: "view",
  type: "function"
}, {
  inputs: [ {
    internalType: "uint256",
    name: "currentSupply",
    type: "uint256"
  }, {
    internalType: "uint256",
    name: "allocatedSupply",
    type: "uint256"
  }, {
    internalType: "uint256",
    name: "tokenOrderSize",
    type: "uint256"
  }, {
    internalType: "uint256",
    name: "desiredRaise",
    type: "uint256"
  } ],
  name: "getTokenBuyQuote",
  outputs: [ {
    internalType: "uint256",
    name: "",
    type: "uint256"
  } ],
  stateMutability: "view",
  type: "function"
}, {
  inputs: [ {
    internalType: "uint256",
    name: "currentSupply",
    type: "uint256"
  }, {
    internalType: "uint256",
    name: "allocatedSupply",
    type: "uint256"
  }, {
    internalType: "uint256",
    name: "tokensToSell",
    type: "uint256"
  }, {
    internalType: "uint256",
    name: "desiredRaise",
    type: "uint256"
  } ],
  name: "getTokenSellQuote",
  outputs: [ {
    internalType: "uint256",
    name: "",
    type: "uint256"
  } ],
  stateMutability: "view",
  type: "function"
} ];

module.exports = {
  farTokenBondingCurveABI: farTokenBondingCurveABI
};
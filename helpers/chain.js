const chainTable = {
  1: "Ethereum mainnet",
  "-7": "PassKey ES256"
}, mapChainIdToName = a => chainTable[a];

module.exports = {
  chainTable: chainTable,
  mapChainIdToName: mapChainIdToName
};
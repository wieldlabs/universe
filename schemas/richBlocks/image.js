const mongoose = require("mongoose"), keyValueFieldsSchema = require("../keyValueFields")["schema"], layersSchema = require("../layers")["schema"], schema = mongoose.Schema({
  src: {
    type: String
  },
  name: {
    type: String
  },
  description: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: !1
  },
  verificationOrigin: {
    type: String
  },
  verificationTokenId: {
    type: String
  },
  verificationChainId: {
    type: Number
  },
  verificationContractAddress: {
    type: String
  },
  verificationExternalUrl: {
    type: String
  },
  metadata: [ keyValueFieldsSchema ],
  layers: [ layersSchema ]
});

module.exports = {
  schema: schema
};
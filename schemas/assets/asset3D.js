const mongoose = require("mongoose"), richBlocksSchema = require("../richContentBlock")["schema"], schema = mongoose.Schema({
  url: {
    type: String
  },
  name: {
    type: String
  },
  assetType: {
    type: String,
    enum: [ "LAND", "PROPS", "HUMANOID" ]
  },
  format: {
    type: String,
    enum: [ "FBX", "GLTF" ]
  },
  previewImage: {
    type: String
  },
  description: {
    type: String
  },
  rarity: {
    type: String,
    enum: [ "COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTICAL", "ONE_OF_ONE" ]
  },
  components: [ richBlocksSchema ]
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};
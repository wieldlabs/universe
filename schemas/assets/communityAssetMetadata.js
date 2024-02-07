const mongoose = require("mongoose"), modification3DSchema = require("../vector/modification3D")["schema"], vector3DSchema = require("../vector/vector3D")["schema"], schema = mongoose.Schema({
  communityAsset: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "CommunityAsset"
  },
  modification: modification3DSchema,
  position: vector3DSchema,
  componentsOverride: {
    type: Map,
    of: Map
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};
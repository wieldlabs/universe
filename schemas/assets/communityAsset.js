const mongoose = require("mongoose"), modification3DSchema = require("../vector/modification3D")["schema"], vector3DSchema = require("../vector/vector3D")["schema"], schema = mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0
  },
  type: {
    type: String,
    enum: [ "ASSET_3D" ]
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Community"
  },
  modification: modification3DSchema,
  position: vector3DSchema,
  positions: [ vector3DSchema ],
  maxQuantity: {
    type: Number,
    default: 1
  },
  metadata: [ {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "CommunityAssetMetadata"
  } ]
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};
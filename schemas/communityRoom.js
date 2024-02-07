const mongoose = require("mongoose"), peerSchema = require("./peer/peer")["schema"], schema = mongoose.Schema({
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
    index: !0
  },
  peers: {
    type: mongoose.Schema.Types.Map,
    of: peerSchema,
    default: {}
  }
}, {
  timestamps: !0
});

schema.index({
  createdAt: -1
}), schema.index({
  updatedAt: -1
}), schema.index({
  joined: 1,
  community: 1
}), module.exports = {
  schema: schema
};
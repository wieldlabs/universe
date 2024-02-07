const mongoose = require("mongoose"), schema = mongoose.Schema({
  role: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "Role",
    required: !0
  },
  accountCommunity: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "AccountCommunity",
    required: !0
  },
  isManagedByIndexer: {
    type: Boolean,
    index: !0
  },
  isValid: {
    type: Boolean,
    default: !0,
    index: !0
  }
}, {
  timestamps: !0
});

schema.index({
  createdAt: -1
}), schema.index({
  updatedAt: -1
}), module.exports = {
  schema: schema
};
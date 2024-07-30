const mongoose = require("mongoose"), schema = mongoose.Schema({
  referralType: {
    type: String,
    required: !0
  },
  isApplied: {
    type: Boolean,
    default: !1
  },
  code: {
    type: String,
    required: !0
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account"
  },
  uniqueIdentifier: {
    type: String
  },
  extraData: {
    type: Object
  }
}, {
  timestamps: !0
});

schema.index({
  referralType: 1,
  isApplied: 1,
  code: 1
}), schema.index({
  referralType: 1,
  isApplied: 1,
  account: 1
}), schema.index({
  referralType: 1,
  code: 1
}), schema.index({
  code: 1
}), module.exports = {
  schema: schema
};
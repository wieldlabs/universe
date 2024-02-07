const mongoose = require("mongoose"), schema = mongoose.Schema({
  isArchived: {
    type: Boolean,
    default: !1
  },
  accounts: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account"
  } ],
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community"
  },
  quest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quest"
  }
}, {
  timestamps: !0
});

schema.index({
  isArchived: 1,
  community: 1
}), schema.index({
  accounts: 1
}), schema.index({
  quest: 1
}), schema.index({
  community: 1,
  quest: 1
}), module.exports = {
  schema: schema
};
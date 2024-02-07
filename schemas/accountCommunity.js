const mongoose = require("mongoose"), schema = mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
    index: !0
  },
  joined: {
    type: Boolean,
    default: !1,
    index: !0
  },
  roles: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AccountCommunityRole",
    index: !0
  } ],
  tokenCount: {
    type: Number,
    default: 0,
    index: !0
  },
  lastSeen: {
    type: Date,
    default: () => new Date(),
    index: !0
  },
  joinedDate: {
    type: Date,
    default: () => new Date(),
    index: !0
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
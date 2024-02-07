const mongoose = require("mongoose"), contentSchema = require("./content")["schema"], accountActivitySchema = require("./accountActivity")["schema"], accountIdentitySchema = require("./accountIdentity")["schema"], accountRecovererSchema = require("./accountRecoverer")["schema"], schema = mongoose.Schema({
  email: {
    type: String,
    index: !0
  },
  walletEmail: {
    type: String,
    index: !0
  },
  encyrptedWalletJson: {
    type: String
  },
  username: {
    type: String,
    index: !0
  },
  wieldTag: {
    type: String,
    index: !0
  },
  usernameLowercase: {
    type: String,
    index: !0
  },
  bio: contentSchema,
  location: {
    type: String
  },
  profileImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image"
  },
  creationOrigin: {
    type: String,
    default: "UNKNOWN"
  },
  activities: accountActivitySchema,
  identities: accountIdentitySchema,
  sections: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AccountSection",
    index: !0
  } ],
  addresses: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AccountAddress",
    index: !0
  } ],
  expoPushTokens: [ String ],
  recoverers: [ accountRecovererSchema ],
  deleted: {
    type: Boolean,
    default: !1,
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
  username: "text",
  bio: "text"
}), module.exports = {
  schema: schema
};
const mongoose = require("mongoose"), socialLinksSchema = require("./socialLinks")["schema"], contentSchema = require("./content")["schema"], schema = mongoose.Schema({
  name: {
    type: String,
    required: !0,
    index: !0
  },
  bio: {
    type: contentSchema
  },
  image: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image"
  },
  bannerImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image"
  },
  bebdomain: {
    type: String,
    index: !0
  },
  tld: {
    type: String,
    index: !0,
    default: "beb"
  },
  host: {
    type: String,
    index: !0,
    default: "https://protocol.wield.co/graphql"
  },
  tokenId: {
    type: String,
    index: !0
  },
  socialLinks: {
    type: socialLinksSchema
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account"
  },
  permissions: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Permission",
    index: !0
  } ],
  roles: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    index: !0
  } ],
  channels: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Channel",
    index: !0
  } ],
  description: {
    type: String
  },
  isFeatured: {
    type: Boolean,
    index: !0,
    default: !1
  }
}, {
  timestamps: !0
});

schema.index({
  createdAt: -1
}), schema.index({
  updatedAt: -1
}), schema.index({
  name: "text",
  bio: "text"
}), module.exports = {
  schema: schema
};
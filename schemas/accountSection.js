const mongoose = require("mongoose"), contentSchema = require("./content")["schema"], entrySchema = mongoose.Schema({
  title: {
    type: String
  },
  image: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image"
  },
  content: contentSchema,
  link: {
    type: String
  }
}), schema = mongoose.Schema({
  title: {
    type: String,
    default: "Untitled section"
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: !0
  },
  entries: [ entrySchema ],
  isVisible: {
    type: Boolean,
    default: !1
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};
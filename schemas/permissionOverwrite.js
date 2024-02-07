const mongoose = require("mongoose"), schema = mongoose.Schema({
  objectTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    required: !0
  },
  objectType: {
    type: Number,
    index: !0,
    required: !0
  },
  allowedPermissionString: {
    type: String
  },
  deniedPermissionString: {
    type: String
  }
}, {
  timestamps: !0
});

module.exports = {
  schema: schema
};
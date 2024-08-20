const mongoose = require("mongoose"), schema = require("../schemas/castHandle")["schema"];

class CastHandleClass {
  static ping() {
    console.log("model: CastHandleClass");
  }
}

schema.loadClass(CastHandleClass);

const CastHandle = mongoose.models.CastHandle || mongoose.model("CastHandle", schema);

module.exports = {
  CastHandle: CastHandle
};
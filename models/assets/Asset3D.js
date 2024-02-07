const mongoose = require("mongoose"), schema = require("../../schemas/assets/asset3D")["schema"];

class Asset3DClass {
  static ping() {
    console.log("model: Asset3DClass");
  }
}

schema.loadClass(Asset3DClass);

const Asset3D = mongoose.models.Asset3D || mongoose.model("Asset3D", schema);

module.exports = {
  Asset3D: Asset3D
};
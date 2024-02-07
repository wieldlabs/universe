const mongoose = require("mongoose"), schema = require("../schemas/permissionOverwrite")["schema"];

class PermissionOverwriteClass {
  static ping() {
    console.log("model: PermissionOverwriteClass");
  }
}

schema.loadClass(PermissionOverwriteClass);

const PermissionOverwrite = mongoose.models.PermissionOverwrite || mongoose.model("PermissionOverwrite", schema);

module.exports = {
  PermissionOverwrite: PermissionOverwrite
};
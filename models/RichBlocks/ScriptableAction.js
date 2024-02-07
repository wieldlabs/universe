const mongoose = require("mongoose"), schema = require("../../schemas/richBlocks/scriptableAction")["schema"];

class ScriptableActionClass {
  static ping() {
    console.log("model: ScriptableActionClass");
  }
}

schema.loadClass(ScriptableActionClass);

const ScriptableAction = mongoose.models.ScriptableAction || mongoose.model("ScriptableAction", schema);

module.exports = {
  ScriptableAction: ScriptableAction
};
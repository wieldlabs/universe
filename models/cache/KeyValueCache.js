const mongoose = require("mongoose"), schema = require("../../schemas/cache/keyValueCache")["schema"];

class KeyValueCacheClass {
  static ping() {
    console.log("model: KeyValueCacheClass");
  }
  static async updateOrCreate({
    key: e,
    value: a,
    expiresAt: s
  }) {
    return this.findOneAndUpdate({
      key: e
    }, {
      $set: {
        value: a,
        expiresAt: s
      }
    }, {
      new: !0,
      upsert: !0
    });
  }
}

schema.loadClass(KeyValueCacheClass);

const KeyValueCache = mongoose.models.KeyValueCache || mongoose.model("KeyValueCache", schema);

module.exports = {
  KeyValueCache: KeyValueCache
};
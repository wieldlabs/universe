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
    var c = await this.findOne({
      key: e
    });
    return c ? (c.value = a, c.expiresAt = s, c.save()) : this.create({
      key: e,
      value: a,
      expiresAt: s
    });
  }
}

schema.loadClass(KeyValueCacheClass);

const KeyValueCache = mongoose.models.KeyValueCache || mongoose.model("KeyValueCache", schema);

module.exports = {
  KeyValueCache: KeyValueCache
};
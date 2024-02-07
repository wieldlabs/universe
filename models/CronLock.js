const mongoose = require("mongoose"), schema = require("../schemas/cronLock")["schema"];

class CronLockClass {
  static ping() {
    console.log("model: CronLockClass");
  }
  static async sleep(e) {
    return new Promise(o => setTimeout(o, e));
  }
  static async createLock(o) {
    return await this.sleep(1e4 * Math.random()), await this.findOne({
      name: o
    }) ? null : this.create({
      name: o
    });
  }
}

schema.loadClass(CronLockClass);

const CronLock = mongoose.models.CronLock || mongoose.model("CronLock", schema);

module.exports = {
  CronLock: CronLock
};
const mongoose = require("mongoose"), BigInt = require("big-integer"), schema = require("../schemas/permission")["schema"], ContentService = require("../services/ContentService")["Service"];

class PermissionClass {
  static ping() {
    console.log("model: PermissionClass");
  }
  static async _verifyUniqueIdentifier({
    uniqueIdentifier: i,
    communityId: e
  }) {
    if (await this.exists({
      uniqueIdentifier: i,
      community: e
    })) throw new Error(`Unique identifier ${i} already token`);
    return !0;
  }
  _generateBitwiseFlagAndPosition(i) {
    if (62 < i || i < 0) throw new Error("Invalid bitwisePosition: must be between 0 and 62");
    return this.bitwisePosition = i || 0, this.bitwiseFlag = BigInt(1 << this.bitwisePosition).toString(), 
    this;
  }
  static async findByUniqueIdentifierOrId({
    communityId: i,
    permissionId: e,
    uniqueIdentifier: n
  }) {
    let t = null;
    if (!(t = e ? await this.findById(e) : t)) {
      if (!i) return null;
      t = await this.findOne({
        uniqueIdentifier: n,
        community: i
      });
    }
    return t;
  }
  static async create({
    communityId: i,
    name: e,
    description: n,
    editable: t,
    bitwisePosition: s,
    uniqueIdentifier: o
  }) {
    if (!i) throw new Error("Invalid community");
    o && await this._verifyUniqueIdentifier({
      uniqueIdentifier: o,
      communityId: i
    });
    i = new Permission({
      community: i,
      name: e,
      description: new ContentService().makeContent({
        contentRaw: n?.raw,
        contentJson: n?.json,
        contentHtml: n?.html
      }),
      editable: t,
      uniqueIdentifier: o
    });
    return i._generateBitwiseFlagAndPosition(s), i.save();
  }
}

schema.loadClass(PermissionClass);

const Permission = mongoose.models.Permission || mongoose.model("Permission", schema);

module.exports = {
  Permission: Permission
};
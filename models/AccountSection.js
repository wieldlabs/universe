const mongoose = require("mongoose"), Account = require("./Account")["Account"], Image = require("./Image")["Image"], schema = require("../schemas/accountSection")["schema"];

class AccountSectionClass {
  static ping() {
    console.log("model: AccountSectionClass");
  }
  static _getDefaultEntry() {
    return {
      title: "New entry",
      content: {}
    };
  }
  static async _accontExistsCheck(t) {
    if (await Account.exists({
      id: t
    }) && t) return !0;
    throw new Error("Invalid Account Id");
  }
  static async _imageExistCheck(t) {
    if (await Image.exists({
      id: t
    })) return !0;
    throw new Error("Invalid Image Id");
  }
  static async addDefaultToAccount({
    includeDefaultEntry: t,
    title: e,
    accountId: i
  }) {
    await this._accontExistsCheck(i);
    t = t ? [ AccountSection._getDefaultEntry() ] : [], e = await this.create({
      title: e || "New section",
      account: i,
      entries: t,
      isVisible: !1
    }), t = await Account.findById(i).select("sections");
    return t.sections = [ ...t.sections, e._id ], await t.save(), e;
  }
  async updateMe({
    title: t,
    isVisible: e
  }) {
    return void 0 !== t && (this.title = t), void 0 !== e && (this.isVisible = e), 
    await this.save(), this;
  }
  async deleteMe() {
    var {
      _id: t,
      account: e
    } = this;
    return await this.remove(), await Account.updateOne({
      _id: e
    }, {
      $pull: {
        sections: t
      }
    }), t;
  }
  async updateEntry(t, {
    imageId: e,
    content: i,
    link: c,
    title: n
  } = {}) {
    t = this.entries.id(t);
    if (t) return void 0 !== e && await AccountSection._imageExistCheck(e), void 0 !== i && (t.content = i), 
    void 0 !== c && (t.link = c), void 0 !== n && (t.title = n), void 0 !== e && (t.image = e), 
    await this.save(), this;
    throw new Error("Invalid entry");
  }
  async addDefauEntry() {
    return this.entries.push(AccountSection._getDefaultEntry()), await this.save(), 
    this;
  }
  async deleteEntry(t) {
    return this.entries.id(t).remove(), await this.save(), this;
  }
}

schema.loadClass(AccountSectionClass);

const AccountSection = mongoose.models.AccountSection || mongoose.model("AccountSection", schema);

module.exports = {
  AccountSection: AccountSection
};
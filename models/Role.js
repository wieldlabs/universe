const mongoose = require("mongoose"), pick = require("lodash/pick"), schema = require("../schemas/role")["schema"], ContentService = require("../services/ContentService")["Service"];

class RoleClass {
  static ping() {
    console.log("model: RoleClass");
  }
  static async findById(e) {
    e = await this.findOne({
      _id: e
    });
    return e?.isHidden ? null : e;
  }
  static async _generateUniqueSlug({
    name: e,
    communityId: n,
    index: i = 0
  }) {
    if (10 < i) throw new Error("Cannot generate unique slug");
    let t = "";
    t = i ? (o = Math.floor(1e3 + 9e3 * Math.random()), e.toLowerCase().replace(/\s/g, "-") + "-" + o) : "" + e.toLowerCase().replace(/\s/g, "-");
    var o = await this.exists({
      slug: t,
      community: n
    });
    return o ? this._generateUniqueSlug({
      name: e,
      communityId: n,
      index: i + 1
    }) : t;
  }
  static async findAndSort({
    communityId: e,
    limit: n = 10,
    offset: i = 0
  }) {
    if (e) return (await this.find({
      community: e
    }).sort("-createdAt").limit(n).skip(i)).filter(e => !0 !== e.isHidden);
    throw new Error("Invalid community");
  }
  static async findDefaultPublicRoleForCommunity({
    communityId: e
  }) {
    if (e) return this.findOne({
      community: e,
      slug: "public"
    });
    throw new Error("Invalid community");
  }
  static async findDefaultOwnerRoleForCommunity({
    communityId: e
  }) {
    if (e) return this.findOne({
      community: e,
      slug: "owner"
    });
    throw new Error("Invalid community");
  }
  async delete() {
    return this.isHidden = !0, this.slug = "deleted-" + this.slug, await this.save(), 
    this._id;
  }
  async edit(e) {
    var n = pick(e, [ "name", "description", "iconId", "color", "isManagedByIndexer" ]);
    return void 0 !== n.name && e.name.length < 64 && this.name !== n.name && (this.name = n.name, 
    this.slug = await this.constructor._generateUniqueSlug({
      name: n.name,
      communityId: this.community
    })), void 0 !== n.color && (this.color = n.color), void 0 !== n.isManagedByIndexer && (this.isManagedByIndexer = n.isManagedByIndexer), 
    void 0 !== n.iconId && (this.icon = n.iconId), void 0 !== n.description && (this.description = new ContentService().makeContent({
      contentRaw: e.description?.raw,
      contentJson: e.description?.json,
      contentHtml: e.description?.html
    })), this.save();
  }
  static async create({
    communityId: e,
    name: n,
    description: i,
    iconId: t,
    position: o,
    color: s,
    isManagedByIndexer: a,
    editable: r
  }) {
    var c;
    if (e) return c = await this._generateUniqueSlug({
      name: n,
      communityId: e
    }), new Role({
      community: e,
      name: n,
      slug: c,
      description: new ContentService().makeContent({
        contentRaw: i?.raw,
        contentJson: i?.json,
        contentHtml: i?.html
      }),
      icon: t,
      position: o,
      color: s,
      isManagedByIndexer: a,
      editable: r
    }).save();
    throw new Error("Invalid community");
  }
}

schema.loadClass(RoleClass);

const Role = mongoose.models.Role || mongoose.model("Role", schema);

module.exports = {
  Role: Role
};
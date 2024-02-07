const PermissionOverwrite = require("../models/PermissionOverwrite")["PermissionOverwrite"], Role = require("../models/Role")["Role"], Account = require("../models/Account")["Account"], PermissionService = require("./PermissionService")["Service"];

class PermissionOverwriteService {
  async createFromPermissionIds({
    objectType: e = "ROLE",
    objectTypeId: r,
    permissionIds: i = [],
    deniedPermissionIds: n = []
  }) {
    if (!i.length && !n.length) return null;
    let s = null;
    switch (e) {
     case "ROLE":
      if (!await Role.findById(r)) throw new Error("Invalid role");
      s = 1;
      break;

     case "USER":
      if (!await Account.findById(r)) throw new Error("Invalid user");
      s = 0;
    }
    if (null === s) throw new Error("Invalid objectType");
    e = new PermissionService();
    let o = null, t = null;
    return i.length && (o = await e.generatePermissionStringFromIds(i)), n.length && (t = await e.generatePermissionStringFromIds(n)), 
    await PermissionOverwrite.create({
      objectTypeId: r,
      objectType: s,
      allowedPermissionString: o,
      deniedPermissionString: t
    });
  }
}

module.exports = {
  Service: PermissionOverwriteService
};
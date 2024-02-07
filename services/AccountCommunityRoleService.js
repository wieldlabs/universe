const Role = require("../models/Role")["Role"], AccountCommunityRole = require("../models/AccountCommunityRole")["AccountCommunityRole"];

class AccountCommunityRoleService {
  async findOrcreateAccountCommunityRole(e, {
    roleId: o,
    isManagedByIndexer: i = void 0,
    isValid: n = !0
  }) {
    if (!e?.community) throw new Error("Invalid community");
    o = await Role.findById(o);
    if (o && e) return i = void 0 === i ? o.isManagedByIndexer : i, await AccountCommunityRole.findOrCreate({
      accountCommunityId: e._id,
      roleId: o._id,
      isManagedByIndexer: i,
      isValid: n
    });
    throw new Error("Invalid role id or community id ");
  }
  async createOrUpdateAccountCommunityRole(e, {
    roleId: o,
    isManagedByIndexer: i = void 0,
    isValid: n = !0
  }) {
    if (!e?.community) throw new Error("Invalid community");
    o = await Role.findById(o);
    if (o && e) return i = void 0 === i ? o.isManagedByIndexer : i, await AccountCommunityRole.createOrUpdate({
      accountCommunityId: e._id,
      roleId: o._id,
      isManagedByIndexer: i,
      isValid: n
    });
    throw new Error("Invalid role id or community id ");
  }
}

module.exports = {
  Service: AccountCommunityRoleService
};
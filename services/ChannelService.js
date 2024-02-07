const _PermissionOverwriteService = require("./PermissionOverwriteService")["Service"], PermissionOverwrite = require("../models/PermissionOverwrite")["PermissionOverwrite"], Role = require("../models/Role")["Role"];

class ChannelService {
  async geChannelPermissionOverwrites(e) {
    return e ? await PermissionOverwrite.find({
      _id: {
        $in: e.permissionsOverwrite
      }
    }) : [];
  }
  async getPermissionOverwriteForChannel(e, {
    objectType: i,
    objectTypeId: r
  }) {
    return await PermissionOverwrite.findOne({
      objectType: i,
      objectTypeId: r,
      _id: {
        $in: e.permissionsOverwrite
      }
    });
  }
  async createPermissionOverwritesForChannelRecipients(e, {
    deniedPermissionString: i,
    allowedPermissionString: r
  }) {
    if (!e || !e.community) throw new Error("Missing params id and community");
    var s = [ {
      objectTypeId: (await Role.findDefaultPublicRoleForCommunity({
        communityId: e.community
      }))._id,
      objectType: 1,
      deniedPermissionString: i
    } ], i = (await e.populate("recipients"), e.recipients);
    for (const n of i) s.push({
      objectTypeId: n.recipientId,
      objectType: n.recipientType,
      allowedPermissionString: r
    });
    return await this.createPermissionOverwrites(e, s), e;
  }
  async createPermissionOverwriteForChannel(e, {
    objectType: i = "ROLE",
    objectTypeId: r,
    permissionIds: s = [],
    deniedPermissionIds: n = []
  }) {
    if (e) return (i = await new _PermissionOverwriteService().createFromPermissionIds({
      objectType: i,
      objectTypeId: r,
      permissionIds: s,
      deniedPermissionIds: n
    })) ? (e.permissionsOverwrite.push(i), await e.save(), i) : null;
    throw new Error("Invalid params");
  }
  async createPermissionOverwrites(e, i = []) {
    if (e) return i = await Promise.all(i.filter(e => e.objectTypeId && (1 === e.objectType || 0 === e.objectType)).map(async e => PermissionOverwrite.create({
      objectTypeId: e.objectTypeId,
      objectType: e.objectType,
      allowedPermissionString: e.allowedPermissionString,
      deniedPermissionString: e.deniedPermissionString
    }))), e.permissionsOverwrite = [ ...e.permissionsOverwrite, ...i ], await e.save(), 
    i;
    throw new Error("Invalid params");
  }
}

module.exports = {
  Service: ChannelService
};
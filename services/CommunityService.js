const Permission = require("../models/Permission")["Permission"], Channel = require("../models/Channel")["Channel"], ChannelRecipient = require("../models/ChannelRecipient")["ChannelRecipient"], Role = require("../models/Role")["Role"], _PermissionService = require("./PermissionService")["Service"];

class CommunityService {
  async canAdmin(e, i, n) {
    return !(!n.account || !e?.owner) && n.account._id.toString() === e.owner.toString();
  }
  async createPermissionForCommunity(e, {
    name: i,
    description: n,
    editable: r,
    uniqueIdentifier: t
  }) {
    if (e) return i = await Permission.create({
      communityId: e._id,
      name: i,
      description: n,
      editable: r,
      uniqueIdentifier: t,
      bitwisePosition: e.permissions?.length || 0
    }), e.permissions.push(i), await e.save(), i;
    throw new Error("Invalid community");
  }
  async createChannelForCommunity(e, {
    name: i,
    description: n,
    recipients: r = []
  }, t = {}) {
    if (!e) throw new Error("Invalid community");
    const a = await Channel.create({
      communityId: e._id,
      name: i,
      description: n,
      createdBy: t.account?._id || t.accountId
    });
    if (e.channels.push(a), await e.save(), 0 < r.length) {
      i = [ ...r ];
      i.push({
        recipientId: t.account?._id || t.accountId,
        recipientType: 0,
        slug: "owner"
      });
      try {
        var o = await Promise.all(i.map(async e => {
          return (await ChannelRecipient.create({
            channel: a._id,
            recipientId: e.recipientId,
            recipientType: e.recipientType,
            slug: e.slug
          }))._id;
        }));
        a.recipients = o, await a.save();
      } catch (e) {
        throw new Error("Error creating channel recipients: " + e.message);
      }
    }
    return a;
  }
  async createRoleForCommunity(e, {
    name: i,
    description: n,
    iconId: r,
    color: t,
    isManagedByIndexer: a,
    editable: o
  }) {
    if (e) return i = await Role.create({
      communityId: e._id,
      name: i,
      description: n,
      iconId: r,
      position: e.roles?.length || 0,
      color: t,
      isManagedByIndexer: a,
      editable: !!o
    }), e.roles.push(i), await e.save(), i;
    throw new Error("Invalid community");
  }
  async getCommunityAllPermissionString(e) {
    var i;
    return e?._id ? (e = await Permission.find({
      community: e._id
    }).select("bitwiseFlag"), i = new _PermissionService(), e = e.map(e => e.bitwiseFlag), 
    i.combinePermissionStrings(e)) : null;
  }
}

module.exports = {
  Service: CommunityService
};
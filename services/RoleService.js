const PermissionService = require("./PermissionService")["Service"], ChannelService = require("./ChannelService")["Service"], Permission = require("../models/Permission")["Permission"], Channel = require("../models/Channel")["Channel"], _IndexerRuleService = require("./IndexerRuleService")["Service"];

class RoleService {
  async createIndexerRuleForRole(e, {
    indexerRuleType: i,
    ruleData: r = {}
  }) {
    if (e) return [ i ] = await new _IndexerRuleService().createRuleWithData({
      indexerRuleType: i,
      ruleData: r,
      communityId: e.community,
      ruleOwnerType: 0,
      ruleOwnerId: e._id
    }), e.indexerRules.push(i), await e.save(), i;
    throw new Error("Invalid role");
  }
  async deleteIndexerRuleForRole(e, {
    indexerRuleId: i
  }) {
    if (!e || !i) throw new Error("Invalid role or indexer rule");
    const r = await new _IndexerRuleService().deleteRule(i);
    return e.indexerRules = e.indexerRules.filter(e => e._id.toString() !== r.toString()), 
    await e.save(), r;
  }
  async canClaimRole(e, i = {}) {
    if (!e?._id) throw new Error("Invalid role");
    if (!e.isManagedByIndexer) return !1;
    var r = (await e.populate("indexerRules")).indexerRules?.[0];
    if (!r) return !1;
    var n = new _IndexerRuleService();
    switch (r.indexerRuleType) {
     case "NFT":
     case "ALLOWLIST":
      return n.canClaimRole(r, {
        data: {
          address: i.address
        }
      });

     case "FARCASTER":
      return n.canClaimRole(r, {
        data: {
          account: i.account,
          address: i.address
        }
      });

     case "API":
      return n.canClaimRole(r, {
        data: {
          address: i.address
        }
      });

     case "PUBLIC":
      return n.canClaimRole(r, {
        data: i
      });

     default:
      return !1;
    }
  }
  async updateRolePermissions(e, {
    permissionIds: i
  }) {
    if (e?._id) return i = await new PermissionService().generatePermissionStringFromIds(i), 
    e.permissionString = i, e.save();
    throw new Error("Invalid role");
  }
  async getRoleBasePermissionArray(i) {
    if (!i?._id || !i?.community) throw new Error("Invalid role");
    const r = new PermissionService();
    return (await Permission.find({
      community: i.community
    })).filter(e => {
      return r.isFlagSetForPermissionString(i.permissionString, e.bitwiseFlag);
    });
  }
  async getRolePermissionOverwrite(e, {
    channelId: i
  }) {
    if (e?._id && e?.community) return !!(i = await Channel.findById(i)) && await new ChannelService().getPermissionOverwriteForChannel(i, {
      objectType: 1,
      objectTypeId: e._id
    });
    throw new Error("Invalid role");
  }
  async hasPermission(e, {
    permissionIdentifier: i,
    permissionId: r,
    channelId: n
  }) {
    if (!e?._id || !e?.community) throw new Error("Invalid role");
    i = await Permission.findByUniqueIdentifierOrId({
      uniqueIdentifier: i,
      permissionId: r,
      communityId: e.community
    });
    if (!i) return !1;
    let s = null;
    r = (s = n ? await this.getRolePermissionOverwrite(e, {
      channelId: n
    }) : s) ? s.allowedPermissionString : e.permissionString;
    return new PermissionService().isFlagSetForPermissionString(r, i.bitwiseFlag);
  }
  computeBasePermissions(e = []) {
    return new PermissionService().combinePermissionStrings(e.map(e => e.permissionString));
  }
  async computePermissionOverwrite(e = [], {
    channelId: i,
    basePermission: r
  }, n = {}) {
    let s = null, a = null, t = r;
    if (!i) return t;
    r = new ChannelService(), i = await Channel.findById(i), r = await r.geChannelPermissionOverwrites(i);
    if (!r?.length) return t;
    const o = {};
    e.forEach(e => {
      o[e._id] = e;
    }), r.forEach(e => {
      1 === e.objectType && o[e.objectTypeId] && (s |= e.allowedPermissionString, 
      a |= e.deniedPermissionString);
    }), t = (t &= ~a) | s;
    i = r.find(e => 0 === e.objectType && e.objectTypeId?.equals?.(n.account?._id || n.accountId));
    return "" + (t = i ? (t &= ~i.deniedPermissionString) | i.allowedPermissionString : t);
  }
  async hasPermissionForRoles(e = [], {
    permissionIdentifier: i,
    permissionId: r,
    channelId: n
  }, s) {
    var a;
    return !!e?.length && (a = this.computeBasePermissions(e), n = await this.computePermissionOverwrite(e, {
      channelId: n,
      basePermission: a
    }, s), !!(a = await Permission.findByUniqueIdentifierOrId({
      uniqueIdentifier: i,
      permissionId: r,
      communityId: e[0].community
    }))) && new PermissionService().isFlagSetForPermissionString(n, a.bitwiseFlag);
  }
}

module.exports = {
  Service: RoleService
};
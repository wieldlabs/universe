const AccountService = require("../AccountService")["Service"];

class CurrentAccountPermissionService extends AccountService {
  currentAccountPermissions(c, e, n) {
    const i = e?.communityId, r = e?.channelId, t = "" + i + (r || "");
    return {
      canRead: async () => {
        if (!i) return !1;
        if (void 0 !== n.communities?.[t]?.canRead) return n.communities?.[t]?.canRead;
        try {
          var c = await this.validPermissionForAccount(n.account || {
            _id: n.accountId
          }, {
            communityId: i,
            channelId: r,
            permissionIdentifier: "READ"
          }, n);
          return n.communities = {
            ...n.communities,
            [t]: {
              canRead: c
            }
          }, c;
        } catch (c) {
          return console.error(c), !1;
        }
      },
      canWrite: async () => {
        if (!i || !n.accountId) return !1;
        if (void 0 !== n.communities?.[t]?.canWrite) return n.communities?.[t]?.canWrite;
        try {
          var c = await this.validPermissionForAccount(n.account || {
            _id: n.accountId
          }, {
            communityId: i,
            channelId: r,
            permissionIdentifier: "WRITE"
          }, n);
          return n.communities = {
            ...n.communities,
            [t]: {
              canWrite: c
            }
          }, c;
        } catch (c) {
          return console.error(c), !1;
        }
      }
    };
  }
}

module.exports = {
  Service: CurrentAccountPermissionService
};
const AccountService = require("../AccountService")["Service"];

class CurrentAccountPermissionService extends AccountService {
  currentAccountPermissions(c, n, e) {
    const i = n?.communityId, t = n?.channelId, r = "" + i + (t || "");
    return {
      canRead: async () => {
        if (!i) return !1;
        if (void 0 !== e.communities?.[r]?.canRead) return e.communities?.[r]?.canRead;
        try {
          var c = await this.validPermissionForAccount(e.account || {
            _id: e.accountId
          }, {
            communityId: i,
            channelId: t,
            permissionIdentifier: "READ"
          }, e);
          return e.communities = {
            ...e.communities,
            [r]: {
              canRead: c
            }
          }, c;
        } catch (c) {
          return console.log(c), !1;
        }
      },
      canWrite: async () => {
        if (!i || !e.accountId) return !1;
        if (void 0 !== e.communities?.[r]?.canWrite) return e.communities?.[r]?.canWrite;
        try {
          var c = await this.validPermissionForAccount(e.account || {
            _id: e.accountId
          }, {
            communityId: i,
            channelId: t,
            permissionIdentifier: "WRITE"
          }, e);
          return e.communities = {
            ...e.communities,
            [r]: {
              canWrite: c
            }
          }, c;
        } catch (c) {
          return console.log(c), !1;
        }
      }
    };
  }
}

module.exports = {
  Service: CurrentAccountPermissionService
};
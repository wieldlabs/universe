const AccountCommunity = require("../../models/AccountCommunity")["AccountCommunity"];

class InitializeAccountCommunityService {
  async createDefaultAccountCommunity(n, {
    communityId: t,
    joined: i = !1
  }, c) {
    if (t) return await AccountCommunity.findOrCreate({
      accountId: c.accountId || c.account?._id,
      communityId: t,
      joined: i
    });
    throw new Error("Invalid community");
  }
  async initialize(n, {
    communityId: t,
    joined: i
  }, c) {
    if (t) return await this.createDefaultAccountCommunity(n, {
      communityId: t,
      joined: i
    }, c);
    throw new Error("Invalid community");
  }
}

module.exports = {
  Service: InitializeAccountCommunityService
};
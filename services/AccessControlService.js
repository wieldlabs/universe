const AccountThread = require("../models/AccountThread")["AccountThread"], AccountCommunity = require("../models/AccountCommunity")["AccountCommunity"], AccountChannel = require("../models/AccountChannel")["AccountChannel"];

class AccessControlService {
  async accountThreadByThreadIdControl(c, {
    threadId: n
  }, t) {
    return !!await AccountThread.exists({
      thread: n,
      account: t.accountId || t.account?._id
    });
  }
  async accountCommunityByCommunityIdControl(c, {
    communityId: n
  }, t) {
    return !!await AccountCommunity.exists({
      community: n,
      account: t.accountId || t.account?._id
    });
  }
  async accountChannelByChannelIdControl(c, {
    channelId: n
  }, t) {
    return !!await AccountChannel.exists({
      channel: n,
      account: t.accountId || t.account?._id
    });
  }
}

module.exports = {
  Service: AccessControlService
};
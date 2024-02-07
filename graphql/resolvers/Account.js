const get = require("lodash/get"), AccountAddress = require("../../models/AccountAddress")["AccountAddress"], AccountNonce = require("../../models/AccountNonce")["AccountNonce"], AccountSection = require("../../models/AccountSection")["AccountSection"], AccountRelationship = require("../../models/AccountRelationship")["AccountRelationship"], AccountThread = require("../../models/AccountThread")["AccountThread"], AccountCommunity = require("../../models/AccountCommunity")["AccountCommunity"], AccountExp = require("../../models/AccountExp")["AccountExp"], AccountInvite = require("../../models/AccountInvite")["AccountInvite"], AccountInventory = require("../../models/AccountInventory")["AccountInventory"], _AccountQueryService = require("../../services/queryServices/AccountQueryService")["Service"], isAuthorizedToAccessResource = require("../../helpers/auth-middleware")["isAuthorizedToAccessResource"], AccountQueryService = new _AccountQueryService(), resolvers = {
  AccountAddress: {
    passKeyId: async (e, c, n) => {
      return isAuthorizedToAccessResource(e, c, n, "accountAddress") ? e?.passKeyId : null;
    },
    counter: async (e, c, n) => {
      return isAuthorizedToAccessResource(e, c, n, "accountAddress") ? e?.counter : null;
    }
  },
  Account: {
    address: async e => {
      return await AccountAddress.findById(get(e, "addresses[0]"));
    },
    relationship: async (e, {
      to: c
    }) => {
      return await AccountRelationship.getTwoWayRelationship({
        from: e._id,
        to: c
      });
    },
    nonces: async e => {
      return await AccountNonce.findOne({
        account: e._id
      });
    },
    profileImage: async (e, c, n) => {
      return e.profileImage ? await n.dataloaders.images.load(e.profileImage) : null;
    },
    accountExp: async e => {
      return await AccountExp.findOne({
        account: e._id
      });
    },
    sections: async e => {
      return await AccountSection.find({
        account: e._id
      });
    },
    accountCommunities: async (e, c) => {
      return await AccountCommunity.findAndSort({
        ...c,
        filters: {
          account: e._id,
          joined: !0
        }
      });
    },
    accountThreads: async (e, c, n) => {
      return isAuthorizedToAccessResource(e, c, n, "account") ? await AccountThread.findAndSortByLatestThreadMessage(e._id, c) : [];
    },
    inventory: async (e, c) => {
      return await AccountInventory.findAndSort({
        ...c,
        filters: {
          account: e._id
        }
      });
    },
    email: async (e, c, n) => {
      return isAuthorizedToAccessResource(e, c, n, "account") ? e?.email : null;
    },
    walletEmail: async (e, c, n) => {
      return isAuthorizedToAccessResource(e, c, n, "account") ? e?.walletEmail : null;
    },
    encyrptedWalletJson: async (e, c, n) => {
      return isAuthorizedToAccessResource(e, c, n, "account") ? e?.encyrptedWalletJson : null;
    },
    backpackAddress: async e => AccountQueryService.backpackAddress(e),
    backpackClaimed: async e => AccountQueryService.backpackClaimed(e),
    identities: async (e, c) => AccountQueryService.identities(e, c),
    invite: async e => {
      return await AccountInvite.findOrCreate({
        accountId: e._id
      });
    },
    hasPremiumRole: async e => AccountQueryService.hasPremiumRole(e)
  }
};

module.exports = {
  resolvers: resolvers
};
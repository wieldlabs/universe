const NotificationService = require("./NotificationService")["Service"], AuthService = require("./AuthService")["Service"], AccessControlService = require("./AccessControlService")["Service"], ExpService = require("./ExpService")["Service"], AccountCommunityService = require("./AccountCommunityService")["Service"], SearchService = require("./SearchService")["Service"], CommunityService = require("./CommunityService")["Service"], RichBlockService = require("./RichBlockService")["Service"], IndexerRuleService = require("./IndexerRuleService")["Service"], RoleService = require("./RoleService")["Service"], ChannelService = require("./ChannelService")["Service"], AccountCommunityRoleService = require("./AccountCommunityRoleService")["Service"], AccountService = require("./AccountService")["Service"], PostService = require("./PostService")["Service"], AccountRecovererService = require("./AccountRecovererService")["Service"];

module.exports = {
  NotificationService: new NotificationService(),
  AccessControlService: new AccessControlService(),
  AuthService: new AuthService(),
  AccountCommunityService: new AccountCommunityService(),
  SearchService: new SearchService(),
  ExpService: new ExpService(),
  CommunityService: new CommunityService(),
  RichBlockService: new RichBlockService(),
  IndexerRuleService: new IndexerRuleService(),
  RoleService: new RoleService(),
  AccountCommunityRoleService: new AccountCommunityRoleService(),
  AccountService: new AccountService(),
  ChannelService: new ChannelService(),
  PostService: new PostService(),
  AccountRecovererService: new AccountRecovererService()
};
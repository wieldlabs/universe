const Community = require("../../models/Community")["Community"], CommunityService = require("../CommunityService")["Service"], _ScoreService = require("../ScoreService")["Service"];

class CommunityMutationService extends CommunityService {
  async editCommunityOrUnauthorized(e, {
    communityId: i,
    ...o
  }, r) {
    var t = await Community.findById(i);
    if (await this.canAdmin(t, {
      communityId: i
    }, r)) return t.edit(o);
    throw new Error("You do not have permission to edit the community.");
  }
  async editCommunityAddressScoreIfAuthorized(e, {
    bebdomain: i,
    ...o
  }, r) {
    if (!o.address) throw new Error("You must specify an address to assign a score.");
    var t = await Community.findOne({
      bebdomain: i
    });
    if (!t) throw new Error("You must specify a valid community to assign a score to.");
    if (await this.canAdmin(t, {
      bebdomain: i
    }, r)) return new _ScoreService().setScore({
      scoreType: t.bebdomain,
      address: o.address,
      score: o.score,
      modifier: o.modifier
    });
    throw new Error("You do not have permission to edit the community.");
  }
  async createRoleForCommunityOrUnauthorized(e, {
    communityId: i,
    roleInput: o
  }, r) {
    var t = await Community.findById(i);
    if (await this.canAdmin(t, {
      communityId: i
    }, r)) return this.createRoleForCommunity(t, {
      ...o,
      editable: !0
    }, r);
    throw new Error("You do not have permission to edit the community.");
  }
}

module.exports = {
  Service: CommunityMutationService
};
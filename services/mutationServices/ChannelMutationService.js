const _CommunityService = require("../CommunityService")["Service"], ChannelService = require("../ChannelService")["Service"], Community = require("../../models/Community")["Community"], Channel = require("../../models/Channel")["Channel"], Account = require("../../models/Account")["Account"], Role = require("../../models/Role")["Role"], cleanRecipients = require("../../helpers/clean-recipients")["cleanRecipients"], getAddressFromEnsOrAddress = require("../../helpers/get-address-from-ens")["getAddressFromEnsOrAddress"], isENS = require("../../helpers/validate-and-convert-address")["isENS"];

class ChannelMutationService extends ChannelService {
  constructor() {
    super(), this.CommunityService = new _CommunityService();
  }
  async _convertChannelRecipients({
    recipients: e
  }) {
    let i = [];
    try {
      i = cleanRecipients(e);
    } catch (e) {
      throw new Error(e.message);
    }
    var r = [];
    if (i.length) {
      for (let e = 0; e < i.length; e++) {
        var {
          recipientType: t,
          locale: a,
          domain: o,
          tld: s
        } = i[e];
        if (!o) throw new Error("Invalid recipient, no dimension found");
        let n;
        if (0 === t) {
          let e = a;
          isENS(a) && (e = await getAddressFromEnsOrAddress(a));
          var d = await Account.findOrCreateByAddressAndChainId({
            address: e,
            chainId: 1
          });
          n = d?._id;
        } else if (1 === t) {
          d = await Community.findOne({
            bebdomain: o,
            tld: s
          }).select("_id");
          if (!d) throw new Error("Invalid domain " + o);
          var c = await Role.findOne({
            slug: a,
            community: d._id
          });
          n = c?._id;
        }
        if (!n) throw new Error(`No recipient ${a} found in ${o}.${s}, did you mean to use a different address?`);
        r.push({
          recipientType: t,
          recipientId: n,
          slug: a + `@${o}.` + s,
          domain: o,
          tld: s
        });
      }
      return r;
    }
    return [];
  }
  async _canAdminChannelOrError(e, n, i) {
    if (!e) throw new Error("Invalid channel");
    if (await e.populate("community"), await this.CommunityService.canAdmin(e.community, n, i)) return !0;
    throw new Error("You do not have permission to edit the channel.");
  }
  async createChannelForCommunityOrUnauthorized(e, {
    channelInput: n,
    communityId: i,
    recipients: r = []
  }, t) {
    if (process.env.DEFAULT_COMMUNITY_ID && i !== process.env.DEFAULT_COMMUNITY_ID && "test" !== process.env.NODE_ENV) throw new Error("You do not have permission to create the channel because DEFAULT_COMMUNITY_ID is set!");
    let a = null;
    var i = (a = r.length ? await this._convertChannelRecipients({
      recipients: [ r[0] ]
    }) : a)?.[0]?.domain, r = a?.[0]?.tld, o = await Community.findOne({
      bebdomain: i,
      tld: r
    });
    if (o) return (n = await this.CommunityService.createChannelForCommunity(o, {
      ...n,
      recipients: a
    }, t)).recipients?.length ? (t = await this.CommunityService.getCommunityAllPermissionString(o), 
    this.createPermissionOverwritesForChannelRecipients(n, {
      allowedPermissionString: t,
      deniedPermissionString: t
    })) : n;
    throw new Error(`Cannot find recipient domain at ${i}.` + r);
  }
  async editChannelForCommunityOrUnauthorized(e, {
    channelId: n,
    channelInput: i
  }, r) {
    var t = await Channel.findById(n);
    return await this._canAdminChannelOrError(t, {
      channelId: n,
      channelInput: i
    }, r), t.edit(i);
  }
  async deleteChannelForCommunityOrUnauthorized(e, {
    channelId: n
  }, i) {
    var r = await Channel.findById(n);
    return await this._canAdminChannelOrError(r, {
      channelId: n
    }, i), r.delete();
  }
}

module.exports = {
  Service: ChannelMutationService
};
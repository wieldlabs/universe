const Account = require("../models/Account")["Account"], Community = require("../models/Community")["Community"], Farcaster = require("../models/Identities/Farcaster")["Farcaster"], {
  UserData,
  UserDataType
} = require("../models/farcaster"), getFarcasterUserByFid = require("../helpers/farcaster")["getFarcasterUserByFid"], filter = require("../helpers/filter"), {
  isAddress,
  isENS
} = require("../helpers/validate-and-convert-address"), getAddressFromEnsOrAddress = require("../helpers/get-address-from-ens")["getAddressFromEnsOrAddress"];

class SearchService {
  _getUsernameHexPattern(e) {
    e = Buffer.from(e, "ascii").toString("hex");
    return new RegExp(`^0x.*${e}.*`, "i");
  }
  async searchFarcasterUserByUsername(e) {
    var e = Buffer.from(e, "ascii").toString("hex");
    let r = await UserData.find({
      value: "0x" + e,
      type: UserDataType.USER_DATA_TYPE_USERNAME,
      deletedAt: null
    }).sort("-updatedAt").limit(5);
    if (r.length < 5 && (e = new RegExp(`^0x${e}.*`, "i"), e = await UserData.find({
      value: e,
      type: UserDataType.USER_DATA_TYPE_USERNAME,
      deletedAt: null
    }).sort("-updatedAt").limit(5 - r.length), r = r.concat(e)), r && 0 < r.length) {
      var t = {};
      for (let e = 0; e < r.length; e++) try {
        var a = await getFarcasterUserByFid(r[e].fid), s = await Account.findOrCreateByAddressAndChainId({
          address: a.custodyAddress,
          chainId: 1
        });
        t[s._id] || (t[s._id] = {
          ...s.toObject(),
          identities: {
            farcaster: {
              ...a
            }
          }
        });
      } catch (e) {
        console.log(e);
        continue;
      }
      return Object.values(t);
    }
    return [];
  }
  async searchAccountByIdentity(e) {
    return (await Farcaster.find({
      $or: [ {
        username: {
          $regex: e,
          $options: "i"
        }
      }, {
        displayName: {
          $regex: e,
          $options: "i"
        }
      } ]
    }).populate("account").sort("-updatedAt").limit(5))?.map(e => e.account);
  }
  async searchAccountByUsernameOrAddressOrENS(e) {
    let r = [];
    if (isAddress(e) || isENS(e)) {
      var t = await getAddressFromEnsOrAddress(e);
      if (!t) return [];
      t = await Account.findByAddressAndChainId({
        address: t,
        chainId: 1
      });
      if (!t) return [];
      if (t.deleted) return [];
      r.push(t);
    } else {
      r = (r = await Account.find({
        username: {
          $regex: e,
          $options: "i"
        },
        deleted: !1
      }).sort("-updatedAt").limit(5)).filter(e => !e.deleted);
      t = await this.searchFarcasterUserByUsername(e);
      t && (r = [ ...r, ...t ]);
    }
    return r;
  }
  async searchCommunityByDomainOrName(e) {
    return (await Community.find({
      $or: [ {
        bebdomain: {
          $regex: e.trim(),
          $options: "i"
        }
      }, {
        name: {
          $regex: e.trim(),
          $options: "i"
        }
      } ]
    }).sort("-updatedAt").limit(20)).filter(e => {
      if ("self-hosted" !== process.env.MODE) {
        if (filter.isProfane(e.name)) return !1;
        if (filter.isProfane(e.bebdomain)) return !1;
      }
      return !0;
    });
  }
}

module.exports = {
  Service: SearchService
};
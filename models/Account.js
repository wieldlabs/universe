const mongoose = require("mongoose"), get = require("lodash/get"), pick = require("lodash/pick"), Magic = require("@magic-sdk/admin")["Magic"], ChainHelpers = require("../helpers/chain"), {
  getFarcasterUserByCustodyAddress,
  getFarcasterUserByFid
} = require("../helpers/farcaster"), AccountAddress = require("./AccountAddress")["AccountAddress"], AccountNonce = require("./AccountNonce")["AccountNonce"], AccountExp = require("./AccountExp")["AccountExp"], Image = require("./Image")["Image"], Post = require("./Post")["Post"], Expo = require("expo-server-sdk")["Expo"], schema = require("../schemas/account")["schema"], generateNewAccessTokenFromAccount = require("../helpers/jwt")["generateNewAccessTokenFromAccount"], validateAndConvertAddress = require("../helpers/validate-and-convert-address")["validateAndConvertAddress"], ContentService = require("../services/ContentService")["Service"], _CacheService = require("../services/cache/CacheService")["Service"], memcache = require("../connectmemcache")["memcache"], Sentry = require("@sentry/node");

class AccountClass {
  static ping() {
    console.log("model: AccountClass");
  }
  static _getPublicFields() {
    return {
      username: 1,
      bio: 1,
      locaion: 1,
      profileImage: 1,
      sections: 1,
      addresses: 1
    };
  }
  static async _existingUsernameCheck(e, a) {
    if (e.username === a) return !0;
    if (e.username?.toLowerCase() === a?.toLowerCase()) return !0;
    e = await Account.exists({
      usernameLowercase: a?.toLowerCase()
    });
    if (e) throw new Error("An account exists with this username.");
    return e;
  }
  static async _existingEmailCheck(e, a) {
    if (e.email === a) return !0;
    e = await Account.exists({
      email: a
    });
    if (e) throw new Error("An account exists with this email.");
    return e;
  }
  static async _profileImageIdExistCheck(e) {
    if (await Image.exists({
      id: e
    })) return !0;
    throw new Error("Invalid Image Id");
  }
  static async createFromEncryptedWalletJson({
    email: e,
    encyrptedWalletJson: a,
    chainId: t
  }) {
    try {
      var s = "0x" + JSON.parse(a).address, n = await this.findOne({
        walletEmail: e
      });
      return n ? n : await this.createFromAddress({
        address: s,
        chainId: t,
        walletEmail: e,
        encyrptedWalletJson: a
      });
    } catch (e) {
      throw console.error(e), new Error(e.message);
    }
  }
  static async deleteAllData({
    account: e
  }) {
    e.email = null, e.walletEmail = null, e.encyrptedWalletJson = null, e.bio = null, 
    e.location = null, e.profileImage = null, e.expoPushTokens = null, e.addresses = null, 
    e.identities = null, e.activities = null, e.recoverers = null, e.deleted = !0, 
    await e.save(), await Post.deleteMany({
      account: e._id
    }), await memcache.delete("Account:findById:" + e._id);
  }
  static async createFromAddress({
    address: e,
    chainId: a,
    email: t,
    walletEmail: s,
    encyrptedWalletJson: n,
    creationOrigin: i
  }) {
    var r = await mongoose.startSession();
    r.startTransaction();
    try {
      if (!get(ChainHelpers, `chainTable[${a}]`)) throw new Error("Invalid chain id");
      var c = validateAndConvertAddress(e, a), o = await this.findByAddressAndChainId({
        address: c,
        chainId: a
      });
      if (o?.deleted) throw new Error("Account is deleted");
      if (o) return o;
      var d = new AccountNonce(), u = new AccountExp(), l = new AccountAddress({
        address: c,
        chain: {
          chainId: a,
          name: ChainHelpers.mapChainIdToName(a)
        }
      }), [ h ] = await this.create([ {
        email: t,
        addresses: [ l._id ],
        activities: {},
        walletEmail: s,
        encyrptedWalletJson: n,
        creationOrigin: i
      } ], {
        session: r
      });
      l.account = h._id, d.account = h._id, u.account = h._id, await l.save({
        session: r
      }), await d.save({
        session: r
      }), await u.save({
        session: r
      });
      try {
        await this.findByAddressAndChainId({
          address: c,
          chainId: a
        });
      } catch (e) {
        throw await h.delete({
          session: r
        }), await l.delete({
          session: r
        }), await d.delete({
          session: r
        }), await u.delete({
          session: r
        }), e;
      }
      return await r.commitTransaction(), r.endSession(), h;
    } catch (e) {
      throw await r.abortTransaction(), r.endSession(), e;
    }
  }
  static async findByAddressAndChainId({
    address: e,
    chainId: a
  }) {
    e = validateAndConvertAddress(e, a);
    let t;
    try {
      var s = await memcache.get(`Account:findByAddressAndChainId:${a}:` + e);
      s && (t = s.value);
    } catch (e) {
      console.error(e);
    }
    if (!t) {
      s = await AccountAddress.findOne({
        address: e
      });
      if (!(t = s?.account)) return null;
      await memcache.set(`Account:findByAddressAndChainId:${a}:` + e, t.toString());
    }
    s = await this.findById(t);
    if (s) return s;
    throw new Error(`AccountAddress has a null account for address ${e} and chainId ${a}!`);
  }
  static async findOrCreateByAddressAndChainId({
    address: e,
    chainId: a,
    creationOrigin: t = "UNKNOWN"
  }) {
    return Account.createFromAddress({
      address: e,
      chainId: a,
      creationOrigin: t
    });
  }
  static async verifySignature({
    address: e,
    chainId: a,
    signature: t
  }) {
    a = await Account.findByAddressAndChainId({
      address: e,
      chainId: a
    });
    if (!a) throw new Error("Account not found");
    var s = await AccountNonce.findOne({
      account: a._id
    });
    if ((await s.decodeAddressBySignature(t)).toLowerCase() !== e.toLowerCase()) throw new Error("Unauthorized");
    if (s) return {
      account: a,
      accountNonce: s
    };
    throw new Error("AccountNonce not found");
  }
  static async authBySignature({
    address: e,
    chainId: a,
    signature: t
  }) {
    let s, n;
    if ("0x0magiclink" == e) {
      var i = new Magic(process.env.MAGIC_LINK_SECRET), i = (await i.token.validate(t), 
      await i.users.getMetadataByToken(t));
      if (!(s = await this.findOne({
        email: i.email
      }))) throw new Error("Account not found");
      n = await AccountNonce.findOne({
        account: s._id
      });
    } else {
      i = await Account.verifySignature({
        address: e,
        chainId: a,
        signature: t
      });
      s = i.account, n = i.accountNonce;
    }
    await n.generateNewNonce();
    e = await generateNewAccessTokenFromAccount(s);
    return {
      account: s,
      accountNonce: n,
      accessToken: e
    };
  }
  async addEncryptedWalletJson(e) {
    if (this.encyrptedWalletJson) throw new Error("Account already has an encrypted wallet json");
    return this.encyrptedWalletJson = e, this.save();
  }
  async updateMe(e) {
    var a, e = pick(e, [ "email", "location", "username", "profileImageId", "bio", "isOnboarded", "expoPushToken" ]);
    return e.username && await Account._existingUsernameCheck(this, e.username), 
    e.profileImageId && await Account._profileImageIdExistCheck(e.profileImageId), 
    e.email && await Account._existingEmailCheck(this, e.email), void 0 !== e.username && (this.username = e.username, 
    this.usernameLowercase = e.username.toLowerCase()), void 0 !== e.location && (this.location = e.location), 
    void 0 !== e.email && (this.email = e.email?.toLowerCase() || null), void 0 !== e.isOnboarded && (this.activities || (this.activities = {}), 
    this.activities.isOnboarded = e.isOnboarded), void 0 !== e.profileImageId && (this.profileImage = e.profileImageId), 
    void 0 !== e.bio && (this.bio = new ContentService().makeContent({
      contentRaw: e.bio
    })), void 0 !== e.expoPushToken && ((a = new Set(this.expoPushTokens || [])).add(e.expoPushToken), 
    this.expoPushTokens = Array.from(a).filter(Expo.isExpoPushToken), this.expoPushTokens = Array.from(a).slice(-5), 
    await this.populate("addresses"), e = this.addresses[0].address?.toLowerCase(), 
    [ a, e ] = await Promise.all([ getFarcasterUserByCustodyAddress(e), getFarcasterUserByFid(e) ]), 
    a = a || e) && await new _CacheService().set({
      key: "expoTokens:" + a.fid,
      value: this.expoPushTokens,
      expiresAt: null
    }), await memcache.delete("Account:findById:" + this._id), this.save();
  }
  get addressId() {
    return get(this, "addresses[0]", null);
  }
  static async findByIdCached(e) {
    var a = await memcache.get("Account:findById:" + e);
    return a ? new Account(JSON.parse(a.value)) : (a = await this.findById(e)) ? (await memcache.set("Account:findById:" + e, JSON.stringify(a)), 
    a) : null;
  }
}

schema.loadClass(AccountClass);

const Account = mongoose.models.Account || mongoose.model("Account", schema);

module.exports = {
  Account: Account
};
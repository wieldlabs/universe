const mongoose = require("mongoose"), get = require("lodash/get"), pick = require("lodash/pick"), Magic = require("@magic-sdk/admin")["Magic"], ChainHelpers = require("../helpers/chain"), {
  getFarcasterUserByCustodyAddress,
  getFarcasterUserByFid
} = require("../helpers/farcaster"), AccountAddress = require("./AccountAddress")["AccountAddress"], AccountNonce = require("./AccountNonce")["AccountNonce"], AccountExp = require("./AccountExp")["AccountExp"], Image = require("./Image")["Image"], Post = require("./Post")["Post"], Expo = require("expo-server-sdk")["Expo"], schema = require("../schemas/account")["schema"], generateNewAccessTokenFromAccount = require("../helpers/jwt")["generateNewAccessTokenFromAccount"], validateAndConvertAddress = require("../helpers/validate-and-convert-address")["validateAndConvertAddress"], ContentService = require("../services/ContentService")["Service"], _CacheService = require("../services/cache/CacheService")["Service"], getMemcachedClient = require("../connectmemcached")["getMemcachedClient"], Sentry = require("@sentry/node");

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
    });
  }
  static async createFromAddress({
    address: e,
    chainId: a,
    email: t,
    walletEmail: s,
    encyrptedWalletJson: n,
    creationOrigin: r
  }) {
    var i = await mongoose.startSession();
    i.startTransaction();
    try {
      if (!get(ChainHelpers, `chainTable[${a}]`)) throw new Error("Invalid chain id");
      var o = validateAndConvertAddress(e, a), c = await this.findByAddressAndChainId({
        address: o,
        chainId: a
      });
      if (c?.deleted) throw new Error("Account is deleted");
      if (c) return c;
      var d = new AccountNonce(), l = new AccountExp(), u = new AccountAddress({
        address: o,
        chain: {
          chainId: a,
          name: ChainHelpers.mapChainIdToName(a)
        }
      }), [ h ] = await this.create([ {
        email: t,
        addresses: [ u._id ],
        activities: {},
        walletEmail: s,
        encyrptedWalletJson: n,
        creationOrigin: r
      } ], {
        session: i
      });
      u.account = h._id, d.account = h._id, l.account = h._id, await u.save({
        session: i
      }), await d.save({
        session: i
      }), await l.save({
        session: i
      });
      try {
        await this.findByAddressAndChainId({
          address: o,
          chainId: a
        });
      } catch (e) {
        throw await h.delete({
          session: i
        }), await u.delete({
          session: i
        }), await d.delete({
          session: i
        }), await l.delete({
          session: i
        }), e;
      }
      return await i.commitTransaction(), i.endSession(), h;
    } catch (e) {
      throw await i.abortTransaction(), i.endSession(), e;
    }
  }
  static async findByAddressAndChainId({
    address: e,
    chainId: a
  }) {
    var t = getMemcachedClient(), e = validateAndConvertAddress(e, a);
    let s;
    try {
      var n = await t.get(`Account:findByAddressAndChainId:${a}:` + e);
      n && (s = n.value);
    } catch (e) {
      console.error(e);
    }
    if (!s) {
      n = await AccountAddress.findOne({
        address: e
      });
      if (!(s = n?.account)) return null;
      try {
        await t.set(`Account:findByAddressAndChainId:${a}:` + e, s.toString());
      } catch (e) {
        console.error(e);
      }
    }
    n = await this.findById(s);
    if (n) return n;
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
      var r = new Magic(process.env.MAGIC_LINK_SECRET), r = (await r.token.validate(t), 
      await r.users.getMetadataByToken(t));
      if (!(s = await this.findOne({
        email: r.email
      }))) throw new Error("Account not found");
      n = await AccountNonce.findOne({
        account: s._id
      });
    } else {
      r = await Account.verifySignature({
        address: e,
        chainId: a,
        signature: t
      });
      s = r.account, n = r.accountNonce;
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
    }), this.save();
  }
  get addressId() {
    return get(this, "addresses[0]", null);
  }
}

schema.loadClass(AccountClass);

const Account = mongoose.models.Account || mongoose.model("Account", schema);

module.exports = {
  Account: Account
};
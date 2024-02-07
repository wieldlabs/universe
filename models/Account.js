const mongoose = require("mongoose"), get = require("lodash/get"), pick = require("lodash/pick"), Magic = require("@magic-sdk/admin")["Magic"], ChainHelpers = require("../helpers/chain"), AccountAddress = require("./AccountAddress")["AccountAddress"], AccountNonce = require("./AccountNonce")["AccountNonce"], AccountExp = require("./AccountExp")["AccountExp"], Image = require("./Image")["Image"], Post = require("./Post")["Post"], schema = require("../schemas/account")["schema"], generateNewAccessTokenFromAccount = require("../helpers/jwt")["generateNewAccessTokenFromAccount"], validateAndConvertAddress = require("../helpers/validate-and-convert-address")["validateAndConvertAddress"], ContentService = require("../services/ContentService")["Service"], getMemcachedClient = require("../connectmemcached")["getMemcachedClient"], Sentry = require("@sentry/node");

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
  static async _validwieldTagCheck(e, a) {
    if (!/^[a-z0-9_]{1,16}$/.test(a)) throw new Error("Invalid wieldTag");
    if (e.wieldTag === a) return !0;
    e = await Account.exists({
      wieldTag: a
    });
    if (e) throw new Error("An account exists with this wieldTag. Try another one.");
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
      var n = "0x" + JSON.parse(a).address, i = await this.findOne({
        walletEmail: e
      });
      return i ? i : await this.createFromAddress({
        address: n,
        chainId: t,
        walletEmail: e,
        encyrptedWalletJson: a
      });
    } catch (e) {
      throw console.log(e), new Error(e.message);
    }
  }
  static async deleteAllData({
    account: e
  }) {
    e.email = null, e.walletEmail = null, e.encyrptedWalletJson = null, e.wieldTag = null, 
    e.bio = null, e.location = null, e.profileImage = null, e.expoPushTokens = null, 
    e.addresses = null, e.identities = null, e.activities = null, e.recoverers = null, 
    e.deleted = !0, await e.save(), await Post.deleteMany({
      account: e._id
    });
  }
  static async createFromAddress({
    address: e,
    chainId: a,
    email: t,
    walletEmail: n,
    encyrptedWalletJson: i,
    creationOrigin: s
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
      var d = new AccountNonce(), l = new AccountExp(), u = new AccountAddress({
        address: c,
        chain: {
          chainId: a,
          name: ChainHelpers.mapChainIdToName(a)
        }
      }), [ h ] = await this.create([ {
        email: t,
        addresses: [ u._id ],
        activities: {},
        walletEmail: n,
        encyrptedWalletJson: i,
        creationOrigin: s
      } ], {
        session: r
      });
      u.account = h._id, d.account = h._id, l.account = h._id, await u.save({
        session: r
      }), await d.save({
        session: r
      }), await l.save({
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
        }), await u.delete({
          session: r
        }), await d.delete({
          session: r
        }), await l.delete({
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
    var t = getMemcachedClient(), e = validateAndConvertAddress(e, a);
    let n;
    try {
      var i = await t.get(`Account:findByAddressAndChainId:${a}:` + e);
      i && (n = i.value);
    } catch (e) {
      console.error(e);
    }
    if (!n) {
      i = await AccountAddress.findOne({
        address: e
      });
      if (!(n = i?.account)) return null;
      try {
        await t.set(`Account:findByAddressAndChainId:${a}:` + e, n.toString());
      } catch (e) {
        console.error(e);
      }
    }
    i = await this.findById(n);
    if (i) return i;
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
    var n = await AccountNonce.findOne({
      account: a._id
    });
    if ((await n.decodeAddressBySignature(t)).toLowerCase() !== e.toLowerCase()) throw new Error("Unauthorized");
    if (n) return {
      account: a,
      accountNonce: n
    };
    throw new Error("AccountNonce not found");
  }
  static async authBySignature({
    address: e,
    chainId: a,
    signature: t
  }) {
    let n, i;
    if ("0x0magiclink" == e) {
      var s = new Magic(process.env.MAGIC_LINK_SECRET), s = (await s.token.validate(t), 
      await s.users.getMetadataByToken(t));
      if (!(n = await this.findOne({
        email: s.email
      }))) throw new Error("Account not found");
      i = await AccountNonce.findOne({
        account: n._id
      });
    } else {
      s = await Account.verifySignature({
        address: e,
        chainId: a,
        signature: t
      });
      n = s.account, i = s.accountNonce;
    }
    await i.generateNewNonce();
    e = await generateNewAccessTokenFromAccount(n);
    return {
      account: n,
      accountNonce: i,
      accessToken: e
    };
  }
  async addEncryptedWalletJson(e) {
    if (this.encyrptedWalletJson) throw new Error("Account already has an encrypted wallet json");
    return this.encyrptedWalletJson = e, this.save();
  }
  async updateMe(e) {
    var a = pick(e, [ "email", "location", "username", "wieldTag", "profileImageId", "bio", "isOnboarded", "expoPushToken" ]);
    return a.username && await Account._existingUsernameCheck(this, a.username), 
    a.profileImageId && await Account._profileImageIdExistCheck(a.profileImageId), 
    a.email && await Account._existingEmailCheck(this, a.email), a.wieldTag && await Account._validwieldTagCheck(this, a.wieldTag), 
    void 0 !== e.wieldTag && (this.wieldTag = a.wieldTag), void 0 !== a.username && (this.username = a.username, 
    this.usernameLowercase = a.username.toLowerCase()), void 0 !== a.location && (this.location = a.location), 
    void 0 !== a.email && (this.email = a.email?.toLowerCase() || null), void 0 !== a.isOnboarded && (this.activities || (this.activities = {}), 
    this.activities.isOnboarded = a.isOnboarded), void 0 !== a.profileImageId && (this.profileImage = a.profileImageId), 
    void 0 !== a.bio && (this.bio = new ContentService().makeContent({
      contentRaw: a.bio
    })), void 0 !== a.expoPushToken && ((e = new Set(this.expoPushTokens || [])).add(a.expoPushToken), 
    this.expoPushTokens = [ ...e ]), this.save();
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
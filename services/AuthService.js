const Magic = require("@magic-sdk/admin")["Magic"], fido2 = require("fido2-lib"), bufferToHex = require("ethereumjs-util")["bufferToHex"], recoverPersonalSignature = require("@metamask/eth-sig-util")["recoverPersonalSignature"], base64url = require("base64url"), mongoose = require("mongoose"), axios = require("axios").default, Account = require("../models/Account")["Account"], AccountAddress = require("../models/AccountAddress")["AccountAddress"], AccountCommunity = require("../models/AccountCommunity")["AccountCommunity"], AccountNonce = require("../models/AccountNonce")["AccountNonce"], {
  getCustodyAddress,
  getCurrentUser
} = require("../helpers/warpcast"), Sentry = require("@sentry/node"), _AccountRecovererService = require("./AccountRecovererService")["Service"], generateNewAccessTokenFromAccount = require("../helpers/jwt")["generateNewAccessTokenFromAccount"], SignedKeyRequest = require("../models/SignedKeyRequest")["SignedKeyRequest"], bufferToAB = e => {
  for (var r = new ArrayBuffer(e.length), t = new Uint8Array(r), a = 0; a < e.length; ++a) t[a] = e[a];
  return r;
};

class AuthService {
  _getRecoverer(e, {
    id: r,
    type: t,
    address: a
  }) {
    return e?.recoverers?.find?.(e => e.id === r && e.pubKey === a && e.type === t);
  }
  async _generateNonceAndAccessToken({
    account: e,
    extra: r = {}
  }) {
    var t;
    if (e) return await (t = await AccountNonce.findOne({
      account: e._id
    })).generateNewNonce(), {
      account: e,
      accountNonce: t,
      accessToken: await generateNewAccessTokenFromAccount(e, r)
    };
    throw new Error("Account not found");
  }
  async getMessageToSign({
    address: e,
    chainId: r,
    creationOrigin: t = "EOA"
  }) {
    e = await Account.findOrCreateByAddressAndChainId({
      address: e,
      chainId: r,
      creationOrigin: t
    });
    if (!e) throw new Error("Account not found");
    if (e.deleted) throw new Error("Account is deleted");
    r = await AccountNonce.findOne({
      account: e._id
    });
    if (r) return r.getMessageToSign();
    throw new Error("AccountNonce not found");
  }
  async getWalletAccountMessageToSign({
    walletEmail: e
  }) {
    e = await Account.findOne({
      walletEmail: e
    });
    if (!e) return {
      message: "Account not found",
      encyrptedWalletJson: null
    };
    if (e.deleted) throw new Error("Account is deleted");
    var r = await AccountNonce.findOne({
      account: e._id
    });
    if (r) return {
      message: r.getMessageToSign(),
      encyrptedWalletJson: e.encyrptedWalletJson
    };
    throw new Error("AccountNonce not found");
  }
  async verifySignature({
    address: e,
    chainId: r,
    signature: t
  }) {
    r = await Account.findByAddressAndChainId({
      address: e,
      chainId: r
    });
    if (!r) throw new Error("Account not found");
    if (r.deleted) throw new Error("Account is deleted");
    var a = await AccountNonce.findOne({
      account: r._id
    });
    if ((await a.decodeAddressBySignature(t)).toLowerCase() !== e.toLowerCase()) throw new Error("Unauthorized");
    if (a) return {
      account: r,
      accountNonce: a
    };
    throw new Error("AccountNonce not found");
  }
  async authBySignature({
    address: e,
    chainId: r,
    signature: t
  }) {
    e = (await this.verifySignature({
      address: e,
      chainId: r,
      signature: t
    })).account;
    return e;
  }
  async authByEmail({
    signature: e
  }) {
    var r = new Magic(process.env.MAGIC_LINK_SECRET), r = (await r.token.validate(e), 
    await r.users.getMetadataByToken(e));
    let t = await Account.findOne({
      email: r.email
    });
    if (t?.deleted) throw new Error("Account is deleted");
    return t = t || await Account.createFromAddress({
      address: r.publicAddress,
      chainId: 1,
      email: r.email
    });
  }
  async authBySignedKeyRequest({
    token: e
  }) {
    let r = 0, t;
    for (;r < 60; ) {
      r += 1, await new Promise(e => setTimeout(e, 1e3));
      var a = await SignedKeyRequest.findOne({
        token: e
      });
      if (!a) throw new Error("Signed key request not found");
      if ("signed" === a?.status) {
        t = a;
        break;
      }
    }
    if (60 <= r) throw new Error("Timeout");
    return this.authenticateWithSigner({
      address: t.address.toLowerCase(),
      chainId: t.chainId,
      signature: t.signature,
      signerData: {
        recovererAddress: t.signerData.key,
        deadline: t.signerData.deadline,
        metadata: t.signerData.metadata,
        signature: t.signerData.signature
      }
    });
  }
  async authByWarpcast({
    address: t,
    token: a,
    chainId: n
  }) {
    try {
      let e = 0, r;
      for (;e < 60; ) {
        e += 1, await new Promise(e => setTimeout(e, 1e3));
        var i = (await axios.get("https://api.warpcast.com/v2/signed-key-request", {
          params: {
            token: a
          }
        }))["data"], s = i.result.signedKeyRequest;
        if ("completed" === s.state) {
          r = s;
          break;
        }
      }
      if (60 <= e) throw new Error("Timeout");
      const l = r.userFid.toString();
      var o = (await getCustodyAddress({
        fid: l,
        token: process.env.FARQUEST_FARCASTER_APP_TOKEN
      }))["custodyAddress"], d = await Account.findOrCreateByAddressAndChainId({
        address: o,
        chainId: n,
        creationOrigin: "WARPCAST"
      });
      if (d?.deleted) throw new Error("Account is deleted");
      var c, u = d.recoverers?.find?.(e => "FARCASTER_SIGNER" === e.type && e.pubKey === t && e.id === l);
      return u ? [ d, u ] : [ c = await new _AccountRecovererService().addRecoverer(d, {
        type: "FARCASTER_SIGNER",
        address: t,
        id: l
      }), this._getRecoverer(c, {
        id: l,
        type: "FARCASTER_SIGNER",
        address: t
      }) ];
    } catch (e) {
      throw console.error(e), new Error("Invalid token");
    }
  }
  async authByFid({
    address: e,
    id: r,
    chainId: t,
    signature: a
  }) {
    try {
      var n = (await this.verifySignature({
        address: e,
        chainId: t,
        signature: a
      }))["account"];
      if (n?.deleted) throw new Error("Account is deleted");
      var i, s, o = new _AccountRecovererService();
      const d = await o.verifyFarcasterSignerAndGetFid(n, {
        signerAddress: r,
        custodyAddress: e
      });
      if (d) return (i = n.recoverers?.find?.(e => "FARCASTER_SIGNER" === e.type && e.pubKey === r && e.id === d.toString())) ? [ n, i ] : [ s = await o.addRecoverer(n, {
        type: "FARCASTER_SIGNER",
        address: r,
        id: d
      }), this._getRecoverer(s, {
        id: d.toString(),
        type: "FARCASTER_SIGNER",
        address: r
      }) ];
      throw new Error("Invalid signer! If this error persists, try logging out and logging in again.");
    } catch (e) {
      throw console.error(e), new Error("Invalid token");
    }
  }
  async authByPassKey({
    signature: e,
    email: r,
    chainId: t
  }) {
    try {
      if ((A = await Account.findOne({
        email: r
      }))?.deleted) throw new Error("Account is deleted");
      if (A) throw new Error("Account already exists");
      var a = JSON.parse(e), n = a.response.clientDataJSON, i = a.response.attestationObject, s = bufferToAB(base64url.toBuffer(a.id)), {
        id: o,
        type: d
      } = a;
      if ("public-key" !== d) throw new Error("Invalid PassKey type");
      var c = new fido2.Fido2Lib({
        timeout: 6e4,
        challengeSize: 52,
        rpId: "production" === process.env.NODE_ENV ? "beb.lol" : "localhost",
        rpName: "beb.lol"
      }), u = {
        challenge: "Y2hhbGxlbmdlIGNoYWxsZW5nZSBjaGFsbGVuZ2UgY2hhbGxlbmdl",
        origin: "production" === process.env.NODE_ENV ? "https://beb.lol" : "http://localhost:5678",
        factor: "either"
      }, l = await c.attestationResult({
        rawId: s,
        id: s,
        response: {
          ...a.response,
          attestationObject: i,
          clientDataJSON: n
        }
      }, u), A = await Account.createFromAddress({
        address: l.authnrData.get("credentialPublicKeyPem"),
        chainId: t,
        email: r
      }), g = await AccountAddress.findOne({
        account: A._id
      });
      return g.counter = l.authnrData.get("counter"), g.passKeyId = o, await g.save(), 
      A;
    } catch (e) {
      throw console.error(e), new Error("Could not parse PassKey signature");
    }
  }
  async authenticate({
    address: e,
    chainId: r,
    signature: t,
    type: a = "SIGNATURE",
    id: n
  }) {
    let i = null, s = !0, o = null;
    if ("SIGNED_KEY_REQUEST" === a) return this.authBySignedKeyRequest({
      token: t
    });
    "PASSKEY" === a ? i = await this.authByPassKey({
      signature: t,
      email: e,
      chainId: r
    }) : "WARPCAST" === a ? ([ i, o ] = await this.authByWarpcast({
      address: e,
      token: t,
      fid: n,
      chainId: r
    }), s = !1) : "FID" === a ? ([ i, o ] = await this.authByFid({
      address: e,
      signature: t,
      id: n,
      chainId: r
    }), s = !1) : i = "0x0magiclink" == e ? await this.authByEmail({
      address: e,
      chainId: r,
      signature: t
    }) : await this.authBySignature({
      address: e,
      chainId: r,
      signature: t
    });
    a = {
      isExternal: s
    };
    return o && (a.signerId = o.id, a.signerPubKey = o.address), this._generateNonceAndAccessToken({
      account: i,
      extra: a
    });
  }
  async authenticateWithSigner({
    address: e,
    chainId: r,
    signature: t,
    signerData: a,
    revokeId: n,
    forceExternal: i = !1
  }) {
    let s = !0;
    let o = null, d = null;
    r = await this.authBySignature({
      address: e,
      chainId: r,
      signature: t
    }), a && (i = 0 != (c = await (t = new _AccountRecovererService()).getFid(r, {
      custodyAddress: e
    }))?.toNumber() && !i, d = (o = i ? (await t.addOrGetSigner(r, {
      signerAddress: a.recovererAddress,
      signature: a.signature,
      deadline: a.deadline,
      metadata: a.metadata,
      fid: c,
      custodyAddress: e
    }), s = !1, c.toNumber()) : (s = !0, e), a.recovererAddress), e = {
      id: c,
      type: i ? "FARCASTER_SIGNER_EXTERNAL" : "FARCASTER_SIGNER",
      address: a.recovererAddress
    }, await t.addRecoverer(r, e));
    var c = {
      isExternal: s
    };
    return o && (c.signerId = o), d && (c.signerPubKey = d), n && (c.revokeId = n), 
    this._generateNonceAndAccessToken({
      account: r,
      extra: c
    });
  }
  async authByEncryptedWalletJson({
    email: e,
    encyrptedWalletJson: r,
    chainId: t,
    signature: a
  }) {
    var n = await Account.findOne({
      walletEmail: e
    }), i = "0x" + JSON.parse(r).address;
    let s;
    if (n) s = await this.authBySignature({
      address: i,
      chainId: t,
      signature: a
    }); else {
      n = r, n = bufferToHex(Buffer.from(n, "utf8"));
      if (recoverPersonalSignature({
        data: n,
        signature: a
      }).toLowerCase() !== i.toLowerCase()) throw new Error("Unauthorized");
      s = await Account.createFromEncryptedWalletJson({
        email: e,
        encyrptedWalletJson: r,
        chainId: t
      });
    }
    return this._generateNonceAndAccessToken({
      account: s
    });
  }
}

module.exports = {
  Service: AuthService
};
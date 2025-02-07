const ethers = require("ethers")["ethers"], crypto = require("crypto"), config = {
  FARCAST_FID: 18548,
  FARCAST_METADATA_ADDRESS: "0xe68ca824c376ea70c439fd7f3c978772903e7f9d",
  KEY_GATEWAY_ADDRESS: "0x00000000fC56947c7E7183f8Ca4B62398CaAdf0B",
  ID_GATEWAY_ADDRESS: "0x00000000fc25870c6ed6b6c7e41fb078b7656f69",
  KEY_GATEWAY_ABI_NONCE: [ {
    inputs: [ {
      internalType: "address",
      name: "owner",
      type: "address"
    } ],
    name: "nonces",
    outputs: [ {
      internalType: "uint256",
      name: "",
      type: "uint256"
    } ],
    stateMutability: "view",
    type: "function"
  } ]
};

async function getEncryptionKey(e, t, r) {
  r = r || Date.now(), t = ethers.utils.defaultAbiCoder.encode([ "string", "address", "uint256" ], [ "FARQUEST_AGENT_ENCRYPTION", t, r ]), 
  t = ethers.utils.keccak256(t);
  return {
    signature: await e.signMessage(ethers.utils.arrayify(t)),
    timestamp: r
  };
}

async function generateSignerKeyPair() {
  var e = await import("@noble/ed25519"), t = (e.etc.sha512Sync = (...e) => crypto.createHash("sha512").update(Buffer.concat(e)).digest(), 
  crypto.randomBytes(32)), e = await e.getPublicKey(t);
  return {
    publicKey: Buffer.from(e).toString("hex"),
    privateKey: Buffer.from(t).toString("hex")
  };
}

async function decryptAgentWallet(e, t) {
  if (t.encryptionMetadata) return e = (await getEncryptionKey(e, t.encryptionMetadata.address, t.encryptionMetadata.timestamp))["signature"], 
  ethers.Wallet.fromEncryptedJson(t.key, e);
  throw new Error("Agent lacks encryption metadata");
}

async function encryptSignerKey(e, t, r) {
  var a = Date.now(), r = ethers.utils.defaultAbiCoder.encode([ "string", "address", "uint256" ], [ "FARQUEST_SIGNER_ENCRYPTION", r, a ]), r = ethers.utils.keccak256(r), t = await t.signMessage(ethers.utils.arrayify(r)), r = crypto.createHash("sha256").update(t).digest(), t = crypto.randomBytes(16), r = crypto.createCipheriv("aes-256-ctr", r, t), e = Buffer.from(e, "hex"), e = Buffer.concat([ r.update(e), r.final() ]);
  return {
    encryptedKey: Buffer.concat([ t, e ]).toString("base64"),
    timestamp: a
  };
}

async function decryptSignerKey(e, t) {
  var r;
  if (e.encryptionMetadata) return r = ethers.utils.defaultAbiCoder.encode([ "string", "address", "uint256" ], [ "FARQUEST_SIGNER_ENCRYPTION", e.encryptionMetadata.address, e.encryptionMetadata.timestamp ]), 
  r = ethers.utils.keccak256(r), t = await t.signMessage(ethers.utils.arrayify(r)), 
  r = crypto.createHash("sha256").update(t).digest(), e = (t = Buffer.from(e.privateKey, "base64")).slice(0, 16), 
  t = t.slice(16), r = crypto.createDecipheriv("aes-256-ctr", r, e), Buffer.concat([ r.update(t), r.final() ]).toString("hex");
  throw new Error("Signer lacks encryption metadata");
}

module.exports = {
  getEncryptionKey: getEncryptionKey,
  generateSignerKeyPair: generateSignerKeyPair,
  decryptAgentWallet: decryptAgentWallet,
  decryptSignerKey: decryptSignerKey,
  encryptSignerKey: encryptSignerKey,
  config: config
};
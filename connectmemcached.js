const MemcacheClient = require("memcache-client")["MemcacheClient"], crypto = require("crypto");

function _validateKey(e) {
  if ("string" != typeof e) throw new Error(`Key must be a string: '${e}'`);
  if (250 < e.length) throw new Error(`Key must be less than 250 characters: '${e}'`);
  if (e.includes(" ")) throw new Error(`Key must not include space: '${e}'`);
}

class SafeMemcacheClient {
  constructor() {
    this.client = new MemcacheClient({
      server: {
        server: process.env.MEMCACHED_URL || "localhost:11211",
        maxConnections: 25
      }
    });
  }
  async get(e, t = null) {
    return _validateKey(e), this.client.get(e, t);
  }
  async set(e, t, n = null) {
    return _validateKey(e), this.client.set(e, t, n);
  }
  async delete(e, t = null) {
    return _validateKey(e), this.client.delete(e, t);
  }
  async incr(e, t, n = null) {
    return _validateKey(e), this.client.incr(e, t, n);
  }
  async decr(e, t, n = null) {
    return _validateKey(e), this.client.decr(e, t, n);
  }
}

let client;

module.exports = {
  getMemcachedClient: () => client = client || new SafeMemcacheClient(),
  getHash: e => crypto.createHash("sha256").update(e).digest("hex")
};
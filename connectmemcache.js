const MemcacheClient = require("memcache-client")["MemcacheClient"], crypto = require("crypto");

function _validateKey(e) {
  if ("string" != typeof e) throw new Error(`Key must be a string: '${e}'`);
  if (250 < e.length) throw new Error(`Key must be less than 250 characters: '${e}'`);
  if (e.includes(" ")) throw new Error(`Key must not include space: '${e}'`);
}

function _validateValue(e) {
  if ("string" == typeof e && 1e6 < e.length) throw new Error(`Value must be less than 1MB: '${e.substring(0, 200)}'`);
}

class SafeMemcacheClient {
  getClient() {
    return this._client ||= new MemcacheClient({
      server: {
        server: process.env.MEMCACHED_URL || "localhost:11211",
        maxConnections: 250
      }
    }), this._client;
  }
  async get(e, t = null, r = {}) {
    var n = this.getClient();
    try {
      return _validateKey(e), await n.get(e, t);
    } catch (e) {
      if (console.error(e), r.throwExceptions) throw e;
      return null;
    }
  }
  async set(e, t, r = null, n = {}) {
    var a = this.getClient();
    try {
      return _validateKey(e), _validateValue(t), await a.set(e, t, r);
    } catch (e) {
      if (console.error(e), n.throwExceptions) throw e;
      return null;
    }
  }
  async delete(e, t = null, r = {}) {
    var n = this.getClient();
    try {
      return _validateKey(e), await n.delete(e, t);
    } catch (e) {
      if (console.error(e), r.throwExceptions) throw e;
      return null;
    }
  }
  async incr(e, t, r = null, n = {}) {
    var a = this.getClient();
    try {
      return _validateKey(e), await a.incr(e, t, r);
    } catch (e) {
      if (console.error(e), n.throwExceptions) throw e;
      return null;
    }
  }
  async decr(e, t, r = null, n = {}) {
    var a = this.getClient();
    try {
      return _validateKey(e), await a.decr(e, t, r);
    } catch (e) {
      if (console.error(e), n.throwExceptions) throw e;
      return null;
    }
  }
}

let client;

module.exports = {
  memcache: new SafeMemcacheClient(),
  getHash: e => crypto.createHash("sha256").update(e).digest("hex")
};
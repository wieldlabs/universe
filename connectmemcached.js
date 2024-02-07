const MemcacheClient = require("memcache-client")["MemcacheClient"], crypto = require("crypto");

let client;

module.exports = {
  getMemcachedClient: () => client = client || new MemcacheClient({
    server: {
      server: process.env.MEMCACHED_URL || "localhost:11211",
      maxConnections: 10
    }
  }),
  getHash: e => crypto.createHash("sha256").update(e).digest("hex")
};
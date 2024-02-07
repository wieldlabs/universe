const mongoose = require("mongoose"), MongoMemoryServer = require("mongodb-memory-server")["MongoMemoryServer"], dotenv = require("dotenv"), createDb = (dotenv.config(), 
async () => {
  const o = await MongoMemoryServer.create();
  return {
    connect: async () => {
      var e = await o.getUri();
      await mongoose.connect(e, {
        useNewUrlParser: !0
      });
    },
    closeDatabase: async () => {
      await mongoose.connection.dropDatabase(), await mongoose.connection.close(), 
      await o.stop();
    },
    clearDatabase: async () => {
      var e = mongoose.connection.collections;
      for (const o in e) await e[o].deleteMany();
    }
  };
});

module.exports = {
  createDb: createDb
};
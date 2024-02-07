const resolvers = {
  Notification: {
    initiator: async (a, e, r) => {
      return await r.dataloaders.accounts.load(a.initiator);
    },
    receiver: async (a, e, r) => {
      return await r.dataloaders.accounts.load(a.receiver);
    },
    image: async (a, e, r) => {
      return a.image ? await r.dataloaders.images.load(a.image) : null;
    }
  }
};

module.exports = {
  resolvers: resolvers
};
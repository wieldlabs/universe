const resolvers = {
  SectionEntry: {
    image: async (e, a, r) => {
      return e.image ? await r.dataloaders.images.load(e.image) : null;
    }
  }
};

module.exports = {
  resolvers: resolvers
};
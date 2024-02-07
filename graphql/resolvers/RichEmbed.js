const resolvers = {
  RichEmbed: {
    image: async (a, e, l) => {
      return a.image ? await l.dataloaders.images.load(a.image) : null;
    },
    thumbnail: async (a, e, l) => {
      return a.thumbnail ? await l.dataloaders.images.load(a.thumbnail) : null;
    }
  }
};

module.exports = {
  resolvers: resolvers
};
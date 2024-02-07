const DataLoader = require("dataloader"), Account = require("../models/Account")["Account"], Community = require("../models/Community")["Community"], Channel = require("../models/Channel")["Channel"], Post = require("../models/Post")["Post"], Image = require("../models/Image")["Image"], Role = require("../models/Role")["Role"], getRolesByIdDataloader = () => new DataLoader(async a => {
  var e = await Role.find({
    _id: {
      $in: a
    }
  });
  const t = {};
  return e.forEach(a => {
    t[a._id] = a;
  }), a.map(a => t[a]);
}), getAccountByIdDataloader = () => new DataLoader(async a => {
  var e = await Account.find({
    _id: {
      $in: a
    }
  });
  const t = {};
  return e.forEach(a => {
    t[a._id] = a;
  }), a.map(a => t[a]);
}), getPostByIdDataloader = () => new DataLoader(async a => {
  var e = await Post.find({
    _id: {
      $in: a
    }
  });
  const t = {};
  return e.forEach(a => {
    t[a._id] = a;
  }), a.map(a => t[a]);
}), getCommunityByIdDataloader = () => new DataLoader(async a => {
  var e = await Community.find({
    _id: {
      $in: a
    }
  });
  const t = {};
  return e.forEach(a => {
    t[a._id] = a;
  }), a.map(a => t[a]);
}), getChannelsByIdDataloader = () => new DataLoader(async a => {
  var e = await Channel.find({
    _id: {
      $in: a
    }
  });
  const t = {};
  return e.forEach(a => {
    t[a._id] = a;
  }), a.map(a => t[a]);
}), getImagesByIdDataloader = () => new DataLoader(async a => {
  var e = await Image.find({
    _id: {
      $in: a
    }
  });
  const t = {};
  return e.forEach(a => {
    t[a._id] = a;
  }), a.map(a => t[a]);
});

module.exports = {
  createDataLoaders: () => ({
    accounts: getAccountByIdDataloader(),
    posts: getPostByIdDataloader(),
    communities: getCommunityByIdDataloader(),
    images: getImagesByIdDataloader(),
    channels: getChannelsByIdDataloader(),
    roles: getRolesByIdDataloader()
  })
};
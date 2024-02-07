const merge = require("lodash/merge"), CommunityQuest = require("./CommunityQuest")["resolvers"], resolvers = merge(CommunityQuest);

module.exports = {
  resolvers: resolvers
};
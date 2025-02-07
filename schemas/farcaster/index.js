const mongoose = require("mongoose"), hubSubscriptionsSchema = new mongoose.Schema({
  host: {
    type: String,
    required: !0,
    unique: !0
  },
  lastEventId: Number,
  lastBackfillFid: Number
}), messagesSchema = (hubSubscriptionsSchema.index({
  lastEventId: 1
}), hubSubscriptionsSchema.index({
  lastBackfillFid: 1
}), hubSubscriptionsSchema.index({
  host: 1
}), new mongoose.Schema({
  deletedAt: Date,
  prunedAt: Date,
  revokedAt: Date,
  timestamp: {
    type: Date,
    required: !0
  },
  messageType: Number,
  fid: {
    type: String,
    required: !0
  },
  hash: {
    type: String,
    required: !0,
    unique: !0
  },
  hashScheme: Number,
  signature: {
    type: String,
    required: !0
  },
  signatureScheme: Number,
  signer: {
    type: String,
    required: !0
  },
  raw: {
    type: String,
    required: !0
  },
  external: {
    type: Boolean,
    default: !1
  },
  unindexed: {
    type: Boolean,
    default: !1
  },
  bodyOverrides: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: !0
})), castsSchema = (messagesSchema.index({
  unindexed: 1
}), messagesSchema.index({
  deletedAt: 1
}, {
  name: "expireDeleted",
  expireAfterSeconds: 0
}), messagesSchema.index({
  prunedAt: 1
}, {
  name: "expirePruned",
  expireAfterSeconds: 0
}), messagesSchema.index({
  revokedAt: 1
}, {
  name: "expireRevoked",
  expireAfterSeconds: 0
}), messagesSchema.index({
  timestamp: 1
}, {
  name: "expireMessages",
  expireAfterSeconds: 604800
}), new mongoose.Schema({
  deletedAt: Date,
  timestamp: {
    type: Date,
    required: !0
  },
  fid: {
    type: String,
    required: !0
  },
  hash: {
    type: String,
    required: !0,
    unique: !0
  },
  parentHash: String,
  parentFid: String,
  parentUrl: String,
  text: {
    type: String,
    default: ""
  },
  embeds: String,
  mentions: [ String ],
  mentionsPositions: [ Number ],
  external: {
    type: Boolean,
    default: !1
  },
  threadHash: {
    type: String
  },
  globalScore: {
    type: Number,
    default: 0
  },
  castType: {
    type: Number,
    default: 0
  },
  tag: {
    type: String
  }
}, {
  timestamps: !0
})), reactionsSchema = (castsSchema.index({
  parentHash: 1,
  deletedAt: 1
}), castsSchema.index({
  fid: 1,
  hash: 1,
  deletedAt: 1
}), castsSchema.index({
  fid: 1,
  deletedAt: 1,
  timestamp: -1
}), castsSchema.index({
  mentions: 1,
  fid: 1,
  deletedAt: 1,
  timestamp: -1
}), castsSchema.index({
  parentUrl: 1,
  deletedAt: 1,
  timestamp: -1,
  globalScore: 1
}), castsSchema.index({
  timestamp: 1,
  _id: 1,
  external: 1
}), castsSchema.index({
  threadHash: 1,
  deletedAt: 1,
  timestamp: -1,
  parentHash: 1
}), castsSchema.index({
  tag: 1,
  deletedAt: 1,
  timestamp: -1
}), castsSchema.index({
  external: 1,
  _id: 1,
  timestamp: 1
}), new mongoose.Schema({
  deletedAt: Date,
  timestamp: {
    type: Date,
    required: !0
  },
  reactionType: Number,
  fid: {
    type: String,
    required: !0
  },
  hash: {
    type: String,
    required: !0,
    unique: !0
  },
  targetHash: String,
  targetFid: String,
  targetUrl: String,
  external: {
    type: Boolean,
    default: !1
  }
}, {
  timestamps: !0
})), signersSchema = (reactionsSchema.index({
  timestamp: 1
}), reactionsSchema.index({
  targetHash: 1,
  reactionType: 1,
  deletedAt: 1
}), reactionsSchema.index({
  targetFid: 1,
  reactionType: 1,
  deletedAt: 1
}), reactionsSchema.index({
  reactionType: 1,
  fid: 1,
  targetHash: 1,
  deletedAt: 1
}), reactionsSchema.index({
  reactionType: 1,
  fid: 1,
  targetUrl: 1
}), new mongoose.Schema({
  deletedAt: Date,
  timestamp: {
    type: Date,
    required: !0
  },
  fid: {
    type: String,
    required: !0
  },
  hash: {
    type: String,
    required: !0,
    unique: !0
  },
  custodyAddress: {
    type: String,
    required: !0
  },
  signer: {
    type: String,
    required: !0
  },
  name: String,
  external: {
    type: Boolean,
    default: !1
  }
}, {
  timestamps: !0
})), claimSchema = (signersSchema.index({
  fid: 1,
  signer: 1
}), new mongoose.Schema({
  address: String,
  claimSignature: String,
  ethSignature: String,
  blockHash: String,
  protocol: Number
}, {
  _id: !1
})), verificationsSchema = new mongoose.Schema({
  deletedAt: Date,
  timestamp: {
    type: Date,
    required: !0
  },
  fid: {
    type: String,
    required: !0
  },
  hash: {
    type: String,
    required: !0,
    unique: !0
  },
  claim: {
    type: String,
    required: !0
  },
  claimObj: {
    type: claimSchema
  },
  external: {
    type: Boolean,
    default: !1
  }
}, {
  timestamps: !0
}), userDataSchema = (verificationsSchema.index({
  fid: 1,
  claim: "text",
  deletedAt: 1
}), verificationsSchema.index({
  claim: "text",
  deletedAt: 1
}), verificationsSchema.index({
  fid: 1,
  deletedAt: 1
}), verificationsSchema.index({
  deletedAt: 1
}), verificationsSchema.index({
  claimObj: 1,
  deletedAt: 1
}), verificationsSchema.index({
  "claimObj.address": 1,
  deletedAt: 1
}), verificationsSchema.index({
  "claimObj.protocol": 1,
  deletedAt: 1,
  fid: 1,
  timestamp: 1
}), verificationsSchema.index({
  deletedAt: 1,
  fid: 1,
  timestamp: 1
}), new mongoose.Schema({
  deletedAt: Date,
  timestamp: {
    type: Date,
    required: !0
  },
  fid: {
    type: String,
    required: !0
  },
  hash: {
    type: String,
    required: !0,
    unique: !0
  },
  type: {
    type: Number,
    required: !0
  },
  value: {
    type: String,
    required: !0
  },
  text: {
    type: String
  },
  external: {
    type: Boolean,
    default: !1
  }
}, {
  timestamps: !0
})), fidsSchema = (userDataSchema.index({
  fid: 1,
  type: 1
}), userDataSchema.index({
  fid: 1,
  deletedAt: 1
}), userDataSchema.index({
  text: "text",
  type: 1,
  deletedAt: 1
}), userDataSchema.index({
  fid: 1,
  type: 1,
  deletedAt: 1
}), userDataSchema.index({
  deletedAt: 1,
  value: 1
}), userDataSchema.index({
  type: 1,
  external: 1,
  deletedAt: 1,
  value: 1
}), userDataSchema.index({
  fid: 1,
  external: 1,
  deletedAt: 1,
  value: 1
}), new mongoose.Schema({
  fid: {
    type: String,
    required: !0,
    unique: !0
  },
  custodyAddress: {
    type: String,
    required: !0
  },
  external: {
    type: Boolean,
    default: !1
  },
  timestamp: {
    type: Date
  },
  nerfed: {
    type: Boolean,
    default: !1
  }
}, {
  timestamps: !0
})), fnamesSchema = (fidsSchema.index({
  fid: 1
}), fidsSchema.index({
  custodyAddress: 1,
  deletedAt: 1
}), fidsSchema.index({
  createdAt: 1
}), new mongoose.Schema({
  fname: {
    type: String,
    required: !0,
    unique: !0
  },
  fid: {
    type: String
  },
  custodyAddress: {
    type: String,
    required: !0
  },
  expiresAt: {
    type: Date,
    required: !0
  },
  external: {
    type: Boolean,
    default: !1
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: !0
})), linksSchema = (fnamesSchema.index({
  fname: 1,
  deletedAt: 1
}), fnamesSchema.index({
  custodyAddress: 1,
  deletedAt: 1
}), fnamesSchema.index({
  fid: 1,
  deletedAt: 1
}), new mongoose.Schema({
  fid: {
    type: String,
    required: !0
  },
  targetFid: {
    type: String,
    required: !0
  },
  hash: {
    type: String,
    required: !0,
    unique: !0
  },
  timestamp: {
    type: Date,
    required: !0
  },
  deletedAt: Date,
  type: {
    type: String,
    required: !0
  },
  displayTimestamp: Date,
  external: {
    type: Boolean,
    default: !1
  }
}, {
  timestamps: !0
})), storageSchema = (linksSchema.index({
  fid: 1,
  targetFid: 1,
  type: 1
}), linksSchema.index({
  fid: 1,
  type: 1,
  deletedAt: 1,
  timestamp: -1
}), linksSchema.index({
  targetFid: 1,
  type: 1,
  deletedAt: 1,
  timestamp: -1
}), linksSchema.index({
  deletedAt: 1
}, {
  name: "expireDeleted",
  expireAfterSeconds: 0
}), new mongoose.Schema({
  deletedAt: Date,
  timestamp: {
    type: Date,
    required: !0
  },
  fid: {
    type: String,
    required: !0
  },
  units: {
    type: Number,
    required: !0
  },
  expiry: {
    type: Date,
    required: !0
  }
}, {
  timestamps: !0
})), notificationsSchema = (storageSchema.index({
  fid: 1,
  deletedAt: 1
}), storageSchema.index({
  deletedAt: 1
}, {
  name: "expireDeleted",
  expireAfterSeconds: 0
}), new mongoose.Schema({
  timestamp: {
    type: Date,
    required: !0
  },
  notificationType: {
    type: String,
    required: !0,
    enum: [ "link", "reply", "reaction", "mention" ]
  },
  fromFid: {
    type: String,
    required: !0
  },
  toFid: {
    type: String,
    required: !0
  },
  payload: {
    type: mongoose.Schema.Types.Mixed
  },
  deletedAt: Date,
  external: {
    type: Boolean,
    default: !1
  }
}, {
  timestamps: !0
})), offerSchema = (notificationsSchema.index({
  toFid: 1,
  fromFid: 1,
  notificationType: 1,
  deletedAt: 1
}), notificationsSchema.index({
  deletedAt: 1
}, {
  name: "expireDeleted",
  expireAfterSeconds: 0
}), notificationsSchema.index({
  timestamp: 1
}, {
  name: "expireNotifications",
  expireAfterSeconds: 2592e3
}), notificationsSchema.index({
  "payload.castHash": 1,
  notificationType: 1,
  fromFid: 1,
  toFid: 1
}), new mongoose.Schema({
  buyerAddress: {
    type: String,
    required: !0
  },
  fid: {
    type: Number,
    required: !0
  },
  deadline: {
    type: String,
    required: !0
  },
  canceledAt: {
    type: Date
  },
  txHash: {
    type: String
  },
  amount: {
    type: String,
    required: !0
  },
  tokenId: {
    type: String
  },
  chainId: {
    type: Number,
    default: 10
  }
}, {
  timestamps: !0
})), listingSchema = (offerSchema.index({
  buyerAddress: 1,
  canceledAt: 1
}), offerSchema.index({
  buyerAddress: 1,
  fid: 1
}), offerSchema.index({
  buyerAddress: 1,
  fid: 1,
  canceledAt: 1
}), offerSchema.index({
  fid: 1,
  canceledAt: 1
}), offerSchema.index({
  tokenId: 1,
  chainId: 1,
  canceledAt: 1
}), offerSchema.index({
  txHash: 1
}), offerSchema.index({
  canceledAt: 1
}), offerSchema.index({
  canceledAt: 1,
  amount: -1
}), offerSchema.index({
  chainId: 1,
  canceledAt: 1,
  amount: -1
}), offerSchema.index({
  fid: 1,
  canceledAt: 1,
  amount: -1
}), offerSchema.index({
  tokenId: 1,
  chainId: 1,
  canceledAt: 1,
  amount: -1
}), new mongoose.Schema({
  ownerAddress: {
    type: String,
    required: !0
  },
  fid: {
    type: Number,
    required: !0
  },
  minFee: {
    type: String,
    required: !0
  },
  deadline: {
    type: Number,
    required: !0
  },
  txHash: {
    type: String
  },
  canceledAt: {
    type: Date
  },
  tokenId: {
    type: String
  },
  chainId: {
    type: Number,
    default: 10
  }
}, {
  timestamps: !0
})), listingLogSchema = (listingSchema.index({
  ownerAddress: 1,
  canceledAt: 1
}), listingSchema.index({
  fid: 1,
  canceledAt: 1
}), listingSchema.index({
  tokenId: 1,
  chainId: 1,
  canceledAt: 1
}), listingSchema.index({
  tokenId: 1,
  chainId: 1
}), listingSchema.index({
  canceledAt: 1
}), listingSchema.index({
  fid: 1,
  canceledAt: 1,
  txHash: 1
}), listingSchema.index({
  fid: 1,
  txHash: 1
}), listingSchema.index({
  fid: 1,
  boughtAt: 1
}), listingSchema.index({
  fid: 1,
  deadline: 1,
  canceledAt: 1
}), listingSchema.index({
  fid: 1,
  ownerAddress: 1,
  deadline: 1,
  canceledAt: 1
}), listingSchema.index({
  fid: 1,
  boughtAt: 1,
  canceledAt: 1
}), listingSchema.index({
  fid: 1,
  boughtAt: 1,
  canceledAt: 1,
  createdAt: 1
}), listingSchema.index({
  canceledAt: 1,
  createdAt: 1,
  deadline: 1
}), listingSchema.index({
  canceledAt: 1,
  boughtAt: 1,
  deadline: 1,
  fid: 1
}), listingSchema.index({
  canceledAt: 1,
  boughtAt: 1,
  deadline: 1,
  fid: 1,
  id: 1
}), listingSchema.index({
  canceledAt: 1,
  id: 1,
  deadline: 1
}), listingSchema.index({
  canceledAt: 1,
  id: 1,
  deadline: 1,
  fid: 1
}), listingSchema.index({
  canceledAt: 1,
  id: 1,
  deadline: 1,
  fid: 1,
  minFee: 1
}), listingSchema.index({
  canceledAt: 1,
  updatedAt: -1,
  _id: 1,
  deadline: 1,
  fid: 1
}), listingSchema.index({
  canceledAt: 1,
  minFee: 1,
  _id: 1,
  deadline: 1,
  fid: 1
}), listingSchema.index({
  canceledAt: 1,
  minFee: -1,
  _id: 1,
  deadline: 1,
  fid: 1
}), listingSchema.index({
  canceledAt: 1,
  fid: 1,
  _id: 1,
  deadline: 1
}), listingSchema.index({
  canceledAt: 1,
  fid: -1,
  _id: 1,
  deadline: 1
}), listingSchema.index({
  canceledAt: 1,
  updatedAt: 1,
  _id: 1,
  deadline: 1,
  fid: 1
}), listingSchema.post("find", function(e) {
  for (var t of e) t.minFee = t.minFee.replace(/^0+/, "");
}), listingSchema.post("findOne", function(e) {
  e && (e.minFee = e.minFee.replace(/^0+/, ""));
}), new mongoose.Schema({
  eventType: {
    type: String,
    required: !0,
    enum: [ "Listed", "Bought", "Canceled", "OfferMade", "OfferCanceled", "OfferApproved" ]
  },
  fid: {
    type: Number,
    required: !0
  },
  from: {
    type: String
  },
  txHash: {
    type: String
  },
  price: {
    type: String
  },
  referrer: {
    type: String
  },
  tokenId: {
    type: String
  },
  chainId: {
    type: Number,
    default: 10
  }
}, {
  timestamps: !0
})), appraisalSchema = (listingLogSchema.index({
  price: -1
}), listingLogSchema.index({
  txHash: 1
}), listingLogSchema.index({
  fid: 1
}), listingLogSchema.index({
  tokenId: 1,
  chainId: 1
}), listingLogSchema.index({
  txHash: 1,
  chainId: 1
}), listingLogSchema.index({
  from: 1,
  eventType: 1
}), listingLogSchema.index({
  fid: 1,
  eventType: 1
}), listingLogSchema.index({
  referrer: 1
}), listingLogSchema.index({
  referrer: 1,
  eventType: 1,
  createdAt: 1
}), listingLogSchema.index({
  eventType: 1
}), listingLogSchema.index({
  fid: 1,
  eventType: 1,
  createdAt: 1
}), listingLogSchema.index({
  eventType: 1,
  createdAt: 1
}), new mongoose.Schema({
  fid: {
    type: String,
    required: !0
  },
  amount: {
    type: String,
    required: !0
  },
  appraisedBy: {
    type: String
  }
}, {
  timestamps: !0
})), frameButtonSchema = (appraisalSchema.index({
  fid: 1
}), new mongoose.Schema({
  text: {
    type: String
  },
  target: {
    type: String
  },
  action: {
    type: String
  }
})), framesSchema = new mongoose.Schema({
  frameButton1: frameButtonSchema,
  frameButton2: frameButtonSchema,
  frameButton3: frameButtonSchema,
  frameButton4: frameButtonSchema,
  frameImageUrl: {
    type: String
  },
  framePostUrl: {
    type: String
  },
  image: {
    type: String
  },
  title: {
    type: String
  },
  sourceUrl: {
    type: String
  },
  description: {
    type: String
  },
  domain: {
    type: String
  },
  hash: {
    type: String
  },
  frameInputText: {
    type: String
  }
}, {
  timestamps: !0
}), reportsSchema = (framesSchema.index({
  sourceUrl: 1
}), framesSchema.index({
  hash: 1
}), framesSchema.index({
  title: 1
}), framesSchema.index({
  createdAt: 1
}, {
  name: "expireFrames",
  expireAfterSeconds: 604800
}), new mongoose.Schema({
  fid: {
    type: String,
    required: !0
  },
  reason: {
    type: String
  },
  count: {
    type: Number,
    default: 0
  },
  reporters: {
    type: [ String ]
  }
}, {
  timestamps: !0
})), syncedChannelsSchema = (reportsSchema.index({
  fid: 1
}), new mongoose.Schema({
  channelId: {
    type: String,
    required: !0
  },
  url: {
    type: String,
    required: !0
  },
  name: {
    type: String,
    required: !0
  },
  description: {
    type: String
  },
  imageUrl: {
    type: String
  },
  leadFid: {
    type: String
  },
  createdAt: {
    type: Number
  },
  followerCount: {
    type: Number,
    default: 0,
    index: !0
  },
  hostFids: {
    type: [ String ]
  }
}, {
  timestamps: !1
})), syncedActionsSchema = (syncedChannelsSchema.index({
  channelId: 1
}), syncedChannelsSchema.index({
  name: 1
}), syncedChannelsSchema.index({
  url: 1
}), syncedChannelsSchema.index({
  createdAt: 1
}), syncedChannelsSchema.index({
  channelId: "text"
}), new mongoose.Schema({
  name: {
    type: String,
    required: !0
  },
  icon: {
    type: String
  },
  description: {
    type: String
  },
  aboutUrl: {
    type: String
  },
  actionUrl: {
    type: String,
    required: !0
  },
  rank: {
    type: Number,
    index: !0
  },
  action: {
    actionType: {
      type: String
    },
    postUrl: {
      type: String
    }
  }
}, {
  timestamps: !0
})), syncedVerificationSchema = (syncedActionsSchema.index({
  name: 1
}), syncedActionsSchema.index({
  actionUrl: 1
}), syncedActionsSchema.index({
  "action.actionType": 1
}), new mongoose.Schema({
  fid: {
    type: String,
    required: !0
  },
  verified: {
    type: Boolean,
    default: !1
  },
  timestamp: {
    type: Date
  }
}, {
  timestamps: !0
})), farpaySchema = (syncedVerificationSchema.index({
  verified: 1
}), syncedVerificationSchema.index({
  fid: 1
}), syncedVerificationSchema.index({
  fid: 1,
  verified: 1
}), syncedVerificationSchema.index({
  updatedAt: 1
}, {
  expireAfterSeconds: 604800
}), new mongoose.Schema({
  uniqueId: {
    type: String,
    index: !0
  },
  txId: {
    type: String,
    required: !0,
    index: !0
  },
  data: {
    type: String
  },
  txHash: {
    type: String,
    index: !0
  },
  callbackUrl: {
    type: String
  }
}, {
  timestamps: !0
})), frameNotificationSchema = new mongoose.Schema({
  fid: {
    type: String,
    required: !0
  },
  appFid: {
    type: String,
    required: !0
  },
  webhookId: {
    type: String,
    required: !0
  },
  notificationDetails: {
    url: {
      type: String,
      required: !0
    },
    token: {
      type: String,
      required: !0
    }
  },
  valid: {
    type: Boolean,
    default: !1
  }
}, {
  timestamps: !0
});

frameNotificationSchema.index({
  fid: 1,
  appFid: 1,
  webhookId: 1
}), frameNotificationSchema.index({
  fid: 1,
  appFid: 1,
  webhookId: 1,
  valid: 1
}), frameNotificationSchema.index({
  valid: 1
}), frameNotificationSchema.index({
  fid: 1,
  valid: 1
}), module.exports = {
  hubSubscriptionsSchema: hubSubscriptionsSchema,
  messagesSchema: messagesSchema,
  castsSchema: castsSchema,
  reactionsSchema: reactionsSchema,
  signersSchema: signersSchema,
  verificationsSchema: verificationsSchema,
  userDataSchema: userDataSchema,
  fidsSchema: fidsSchema,
  fnamesSchema: fnamesSchema,
  linksSchema: linksSchema,
  notificationsSchema: notificationsSchema,
  offerSchema: offerSchema,
  listingSchema: listingSchema,
  storageSchema: storageSchema,
  appraisalSchema: appraisalSchema,
  listingLogSchema: listingLogSchema,
  framesSchema: framesSchema,
  reportsSchema: reportsSchema,
  syncedChannelsSchema: syncedChannelsSchema,
  syncedActionsSchema: syncedActionsSchema,
  syncedVerificationSchema: syncedVerificationSchema,
  farpaySchema: farpaySchema,
  frameNotificationSchema: frameNotificationSchema
};
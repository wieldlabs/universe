const mongoose = require("mongoose"), agentSchema = new mongoose.Schema({
  agentId: {
    type: String,
    index: !0,
    unique: !0,
    required: !0
  },
  expiresAt: {
    type: Date,
    index: !0
  },
  fid: {
    type: String,
    index: !0
  },
  external: {
    type: Boolean,
    default: !1
  },
  key: {
    type: String
  },
  currentOwnerFid: {
    type: String,
    index: !0
  },
  currentOwnerAddress: {
    type: String,
    index: !0
  },
  instructions: {
    type: String
  },
  examples: {
    type: String
  },
  agentAddress: {
    type: String,
    index: !0
  },
  tokenAddress: {
    type: String,
    index: !0,
    validate: {
      validator: function(e) {
        return e === e.toLowerCase();
      },
      message: e => e.value + " must be lowercase"
    }
  },
  tipWrapperAddress: {
    type: String,
    index: !0,
    validate: {
      validator: function(e) {
        return e === e.toLowerCase();
      },
      message: e => e.value + " must be lowercase"
    }
  },
  encryptionMetadata: {
    address: {
      type: String
    },
    timestamp: {
      type: String
    },
    key: {
      type: String
    }
  },
  type: {
    type: String,
    enum: [ "CLAN" ],
    index: !0
  },
  signerKeys: [ {
    publicKey: {
      type: String
    },
    privateKey: {
      type: String
    },
    encryptionMetadata: {
      address: {
        type: String
      },
      timestamp: {
        type: String
      },
      key: {
        type: String
      }
    }
  } ],
  tokenSymbol: {
    type: String
  },
  isReserved: {
    type: Boolean,
    default: !1
  },
  defaultLimit: {
    type: Number
  },
  maxTipAmount: {
    type: Number
  },
  minTipAmount: {
    type: Number
  },
  public: {
    type: Boolean
  },
  publicMinTipAmount: {
    type: Number
  },
  publicMaxTipAmount: {
    type: Number
  }
}, {
  timestamps: !0
}), agentRequestSchema = (agentSchema.index({
  fid: 1,
  expiresAt: 1
}), agentSchema.index({
  agentId: 1,
  expiresAt: 1
}), agentSchema.index({
  expiresAt: 1,
  isReserved: 1
}), agentSchema.index({
  type: 1,
  _id: 1
}), agentSchema.index({
  type: 1,
  createdAt: 1
}), agentSchema.index({
  type: 1,
  tokenAddress: "text"
}), agentSchema.index({
  type: 1,
  tokenAddress: "text",
  createdAt: 1
}), agentSchema.index({
  agentId: 1,
  type: 1
}), agentSchema.index({
  agentId: 1,
  type: 1,
  expiresAt: 1
}), agentSchema.index({
  type: 1,
  tokenSymbol: "text"
}), agentSchema.index({
  type: 1,
  currentOwnerFid: 1,
  tokenSymbol: "text"
}), agentSchema.index({
  tokenSymbol: "text"
}), agentSchema.index({
  type: 1,
  tokenAddress: "text"
}), new mongoose.Schema({
  currentOwnerFid: {
    type: String,
    required: !0,
    index: !0
  },
  currentOwnerAddress: {
    type: String,
    required: !0,
    index: !0
  },
  instructions: {
    type: String
  },
  examples: {
    type: String
  },
  status: {
    type: String,
    enum: [ "pending", "completed", "archived", "failed" ],
    default: "pending",
    index: !0,
    required: !0
  },
  type: {
    type: String,
    enum: [ "CLAN_CREATION" ],
    default: "CLAN_CREATION",
    index: !0,
    required: !0
  },
  requestHash: {
    type: String,
    index: !0,
    unique: !0,
    required: !0
  },
  tokenOptions: {
    imageUrl: {
      type: String
    },
    name: {
      type: String
    },
    symbol: {
      type: String
    },
    allocatedSupply: {
      type: String
    },
    desiredRaise: {
      type: String
    },
    nsfw: {
      type: Boolean,
      default: !1
    }
  },
  notes: {
    type: String
  },
  error: {
    type: String
  },
  completedAt: {
    type: Date
  },
  isAnon: {
    type: Boolean,
    default: !1
  },
  tokenAddress: {
    type: String,
    index: !0
  }
}, {
  timestamps: !0
})), agentAuthorizationSchema = (agentRequestSchema.index({
  currentOwnerFid: 1,
  status: 1
}), agentRequestSchema.index({
  currentOwnerFid: 1,
  createdAt: 1
}), agentRequestSchema.index({
  createdAt: 1,
  status: 1
}), agentRequestSchema.index({
  type: 1,
  status: 1
}), new mongoose.Schema({
  fid: {
    type: String,
    required: !0,
    index: !0
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "farcaster.Agent"
  },
  isValid: {
    type: Boolean,
    default: !1
  },
  limit: {
    type: Number,
    default: 0
  },
  agentEventId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "farcaster.AgentEvent"
  },
  castHash: {
    type: String,
    index: !0,
    unique: !0,
    required: !0
  },
  validatedAt: {
    type: Date
  },
  canceledAt: {
    type: Date
  },
  signerData: {
    signature: {
      type: String
    },
    timestamp: {
      type: Number
    }
  }
}, {
  timestamps: !0
})), agentEventSchema = (agentAuthorizationSchema.index({
  fid: 1,
  agent: 1,
  isValid: 1
}), agentAuthorizationSchema.index({
  fid: 1,
  agent: 1
}), agentAuthorizationSchema.index({
  agent: 1,
  fid: 1
}), agentAuthorizationSchema.index({
  agent: 1,
  isValid: 1
}), agentAuthorizationSchema.index({
  agent: 1,
  isValid: 1,
  fid: 1
}), new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "farcaster.Agent"
  },
  event: {
    type: String,
    index: !0,
    required: !0,
    enum: [ "MENTION", "REPLY", "ERROR" ]
  },
  castHash: {
    type: String,
    index: !0,
    unique: !0,
    required: !0
  },
  castFid: {
    type: String,
    required: !0
  },
  castTimestamp: {
    type: Date,
    required: !0
  },
  castAudit: {
    type: String
  },
  intent: {
    type: String
  },
  intentArgs: {
    type: String
  },
  isProcessed: {
    type: Boolean,
    default: !1
  },
  processedAt: {
    type: Date
  },
  processedError: {
    type: String
  },
  error: {
    type: String
  },
  errorType: {
    type: String,
    enum: [ "INVALID_FORMAT", "MULTIPLE_AGENTS_MATCHED", "INVALID_INTERACTION_TYPE", "DEEP_REPLY_CHAIN", "NO_VALID_AGENT_FOUND", "OTHER" ]
  }
}, {
  timestamps: !0
})), agentTipSchema = (agentEventSchema.index({
  agent: 1,
  castHash: 1
}), agentEventSchema.index({
  agent: 1,
  castFid: 1
}), agentEventSchema.index({
  agent: 1,
  castTimestamp: 1
}), agentEventSchema.index({
  agent: 1,
  event: 1
}), agentEventSchema.index({
  agent: 1,
  isProcessed: 1
}), agentEventSchema.index({
  agent: 1,
  isProcessed: 1,
  event: 1
}), agentEventSchema.index({
  isProcessed: 1
}), new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "farcaster.Agent",
    required: !0
  },
  agentEventId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "farcaster.AgentEvent",
    required: !0
  },
  agentAuthorizationId: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "farcaster.AgentAuthorization",
    required: !0
  },
  tipperFid: {
    type: String,
    index: !0,
    required: !0
  },
  fid: {
    type: String,
    index: !0,
    required: !0
  },
  address: {
    type: String,
    index: !0,
    required: !0,
    validate: {
      validator: function(e) {
        return e === e.toLowerCase();
      },
      message: e => e.value + " must be lowercase"
    }
  },
  amount: {
    type: Number,
    required: !0
  },
  castHash: {
    type: String,
    index: !0,
    unique: !0,
    required: !0
  },
  expiresAt: {
    type: Date,
    index: !0,
    required: !0
  },
  claimedAt: {
    type: Date
  },
  signerData: {
    signature: {
      type: String
    },
    timestamp: {
      type: Number
    }
  }
}, {
  timestamps: !0
})), agentTipLogSchema = (agentTipSchema.index({
  agent: 1,
  agentEventId: 1
}), agentTipSchema.index({
  agent: 1,
  fid: 1
}), agentTipSchema.index({
  agentEventId: 1,
  fid: 1
}), agentTipSchema.index({
  agent: 1,
  castHash: 1
}), agentTipSchema.index({
  agent: 1,
  expiresAt: 1
}), agentTipSchema.index({
  agent: 1,
  claimedAt: 1
}), agentTipSchema.index({
  agentAuthorizationId: 1,
  fid: 1
}), agentTipSchema.index({
  agentAuthorizationId: 1,
  agent: 1
}), agentTipSchema.index({
  agentAuthorizationId: 1,
  agentEventId: 1
}), agentTipSchema.index({
  agentAuthorizationId: 1,
  fid: 1
}), agentTipSchema.index({
  agentAuthorizationId: 1,
  castHash: 1
}), agentTipSchema.index({
  agentAuthorizationId: 1,
  expiresAt: 1
}), agentTipSchema.index({
  agentAuthorizationId: 1,
  claimedAt: 1
}), agentTipSchema.index({
  tipperFid: 1,
  agent: 1,
  createdAt: 1
}), new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    index: !0,
    ref: "farcaster.Agent",
    required: !0
  },
  deadline: {
    type: Date,
    required: !0
  },
  nonce: {
    type: Number,
    required: !0
  },
  signature: {
    type: String,
    required: !0
  },
  to: {
    type: String,
    required: !0
  },
  amount: {
    type: Number,
    required: !0
  },
  requesterAddress: {
    type: String
  },
  requesterFid: {
    type: String
  },
  hash: {
    type: String
  }
}, {
  timestamps: !0
})), agentInviteSchema = new mongoose.Schema({
  fid: {
    type: String,
    index: !0,
    required: !0
  },
  isInvited: {
    type: Boolean,
    default: !1
  }
}, {
  timestamps: !0
});

module.exports = {
  agentSchema: agentSchema,
  agentRequestSchema: agentRequestSchema,
  agentAuthorizationSchema: agentAuthorizationSchema,
  agentEventSchema: agentEventSchema,
  agentTipSchema: agentTipSchema,
  agentTipLogSchema: agentTipLogSchema,
  agentInviteSchema: agentInviteSchema
};
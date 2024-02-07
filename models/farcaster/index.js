const mongoose = require("mongoose"), {
  hubSubscriptionsSchema,
  messagesSchema,
  castsSchema,
  reactionsSchema,
  signersSchema,
  verificationsSchema,
  userDataSchema,
  fidsSchema,
  fnamesSchema,
  linksSchema,
  notificationsSchema,
  listingSchema,
  offerSchema,
  storageSchema,
  listingLogSchema,
  appraisalSchema,
  framesSchema
} = require("../../schemas/farcaster");

class HubSubscriptionsClass {
  static ping() {
    console.log("model: HubSubscriptionsClass");
  }
}

hubSubscriptionsSchema.loadClass(HubSubscriptionsClass);

const HubSubscriptions = mongoose.models.HubSubscriptions || mongoose.model("farcaster.HubSubscriptions", hubSubscriptionsSchema);

class MessagesClass {
  static ping() {
    console.log("model: MessagesClass");
  }
}

messagesSchema.loadClass(MessagesClass);

const Messages = mongoose.models.Messages || mongoose.model("farcaster.Messages", messagesSchema);

class CastsClass {
  static ping() {
    console.log("model: CastsClass");
  }
}

castsSchema.loadClass(CastsClass);

const Casts = mongoose.models.Casts || mongoose.model("farcaster.Casts", castsSchema);

class ReactionsClass {
  static async countDistinct(s) {
    return s && 0 < (s = await this.aggregate([ {
      $match: s
    }, {
      $group: {
        _id: "$fid"
      }
    }, {
      $group: {
        _id: null,
        count: {
          $sum: 1
        }
      }
    } ])).length ? s[0].count : 0;
  }
  static ping() {
    console.log("model: ReactionsClass");
  }
}

reactionsSchema.loadClass(ReactionsClass);

const Reactions = mongoose.models.Reactions || mongoose.model("farcaster.Reactions", reactionsSchema);

class SignersClass {
  static ping() {
    console.log("model: SignersClass");
  }
}

signersSchema.loadClass(SignersClass);

const Signers = mongoose.models.Signers || mongoose.model("farcaster.Signers", signersSchema);

class VerificationsClass {
  static ping() {
    console.log("model: VerificationsClass");
  }
}

verificationsSchema.loadClass(VerificationsClass);

const Verifications = mongoose.models.Verifications || mongoose.model("farcaster.Verifications", verificationsSchema);

class UserDataClass {
  static ping() {
    console.log("model: UserDataClass");
  }
}

userDataSchema.loadClass(UserDataClass);

const UserData = mongoose.models.UserData || mongoose.model("farcaster.UserData", userDataSchema);

class FidsClass {
  static ping() {
    console.log("model: FidsClass");
  }
}

fidsSchema.loadClass(FidsClass);

const Fids = mongoose.models.Fids || mongoose.model("farcaster.Fids", fidsSchema);

class FnamesClass {
  static ping() {
    console.log("model: FnamesClass");
  }
}

fnamesSchema.loadClass(FnamesClass);

const Fnames = mongoose.models.Fnames || mongoose.model("farcaster.Fnames", fnamesSchema);

class LinksClass {
  static ping() {
    console.log("model: LinksClass");
  }
}

linksSchema.loadClass(LinksClass);

const Links = mongoose.models.Links || mongoose.model("farcaster.Links", linksSchema);

class NotificationsClass {
  static ping() {
    console.log("model: NotificationsClass");
  }
}

class StorageClass {
  static ping() {
    console.log("model: StorageClass");
  }
}

storageSchema.loadClass(StorageClass);

const Storage = mongoose.models.Storage || mongoose.model("farcaster.Storage", storageSchema), Notifications = (notificationsSchema.loadClass(NotificationsClass), 
mongoose.models.Notifications || mongoose.model("farcaster.Notifications", notificationsSchema));

class ListingClass {
  static ping() {
    console.log("model: ListingClass");
  }
}

listingSchema.loadClass(ListingClass);

const Listings = mongoose.models.Listings || mongoose.model("farcaster.Listings", listingSchema);

class ListingLogsClass {
  static ping() {
    console.log("model: ListingLogsClass");
  }
}

listingLogSchema.loadClass(ListingLogsClass);

const ListingLogs = mongoose.models.ListingLogs || mongoose.model("farcaster.ListingLogs", listingLogSchema);

class OfferClass {
  static ping() {
    console.log("model: OfferClass");
  }
}

offerSchema.loadClass(OfferClass);

const Offers = mongoose.models.Offers || mongoose.model("farcaster.Offers", offerSchema);

class AppraisalClass {
  static ping() {
    console.log("model: AppraisalClass");
  }
}

offerSchema.loadClass(AppraisalClass);

const Appraisals = mongoose.models.Appraisals || mongoose.model("farcaster.Appraisals", appraisalSchema);

class FramesClass {
  static ping() {
    console.log("model: FramesClass");
  }
}

offerSchema.loadClass(FramesClass);

const Frames = mongoose.models.Frames || mongoose.model("farcaster.Frames", framesSchema), UserDataType = {
  USER_DATA_TYPE_NONE: 0,
  USER_DATA_TYPE_PFP: 1,
  USER_DATA_TYPE_DISPLAY: 2,
  USER_DATA_TYPE_BIO: 3,
  USER_DATA_TYPE_URL: 5,
  USER_DATA_TYPE_USERNAME: 6
}, ReactionType = {
  REACTION_TYPE_NONE: 0,
  REACTION_TYPE_LIKE: 1,
  REACTION_TYPE_RECAST: 2
}, MessageType = {
  MESSAGE_TYPE_NONE: 0,
  MESSAGE_TYPE_CAST_ADD: 1,
  MESSAGE_TYPE_CAST_REMOVE: 2,
  MESSAGE_TYPE_REACTION_ADD: 3,
  MESSAGE_TYPE_REACTION_REMOVE: 4,
  MESSAGE_TYPE_LINK_ADD: 5,
  MESSAGE_TYPE_LINK_REMOVE: 6,
  MESSAGE_TYPE_VERIFICATION_ADD_ETH_ADDRESS: 7,
  MESSAGE_TYPE_VERIFICATION_REMOVE: 8,
  MESSAGE_TYPE_SIGNER_ADD: 9,
  MESSAGE_TYPE_SIGNER_REMOVE: 10,
  MESSAGE_TYPE_USER_DATA_ADD: 11,
  MESSAGE_TYPE_USERNAME_PROOF: 12
};

module.exports = {
  HubSubscriptions: HubSubscriptions,
  Messages: Messages,
  Casts: Casts,
  Reactions: Reactions,
  Signers: Signers,
  Verifications: Verifications,
  UserData: UserData,
  Fids: Fids,
  Fnames: Fnames,
  Links: Links,
  Notifications: Notifications,
  Listings: Listings,
  Offers: Offers,
  UserDataType: UserDataType,
  ReactionType: ReactionType,
  MessageType: MessageType,
  Storage: Storage,
  ListingLogs: ListingLogs,
  Appraisals: Appraisals,
  Frames: Frames
};
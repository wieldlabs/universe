const fetch = require("node-fetch");

class WarpcastError extends Error {
  constructor(t) {
    super(JSON.stringify(t)), this.name = "WarpcastError";
  }
}

const fetchRetry = async (t, r, a = 3) => {
  let s;
  for (let e = 0; e < a; e++) {
    try {
      return await fetch(t, r);
    } catch (t) {
      s = t;
    }
    await new Promise(t => setTimeout(t, 2 ** (e + 1) * 1e3));
  }
  throw s;
}, getAllRecentCasts = async ({
  token: t,
  limit: e
}) => {
  e = "https://api.warpcast.com/v2/recent-casts?limit=" + e, e = await (await fetchRetry(e, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3
  })).json();
  if (e?.errors) throw new WarpcastError(e?.errors);
  return {
    casts: e?.result?.casts
  };
}, getCast = async ({
  token: t,
  hash: e
}) => {
  e = await (await fetchRetry("https://api.warpcast.com/v2/cast?hash=" + e, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3
  })).json();
  if (e?.errors) throw new WarpcastError(e?.errors);
  return {
    cast: e?.result?.cast
  };
}, getCustodyAddress = async ({
  token: t,
  fid: e
}) => {
  e = await (await fetchRetry("https://api.warpcast.com/v2/custody-address?fid=" + e, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3
  })).json();
  if (e?.errors) throw new WarpcastError(e?.errors);
  return {
    custodyAddress: e?.result?.custodyAddress
  };
}, getAllCastsInThread = async ({
  token: t,
  threadHash: e
}) => {
  e = await (await fetchRetry("https://api.warpcast.com/v2/all-casts-in-thread?threadHash=" + e, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3
  })).json();
  if (e?.errors) throw new WarpcastError(e?.errors);
  return {
    casts: e?.result?.casts
  };
}, getCasts = async ({
  token: t,
  fid: e,
  limit: r,
  cursor: a
}) => {
  e = await (await fetchRetry(`https://api.warpcast.com/v2/casts?fid=${e}&limit=` + r + (a ? "&cursor=" + a : ""), {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3
  })).json();
  if (e?.errors) throw new WarpcastError(e?.errors);
  return {
    casts: e?.result?.casts,
    next: e?.next
  };
}, postCasts = async ({
  token: t,
  text: e,
  parentHash: r
}) => {
  t = await (await fetchRetry("https://api.warpcast.com/v2/casts", {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3,
    body: {
      text: e,
      parent: {
        hash: r
      }
    }
  })).json();
  return {
    casts: t?.result?.casts,
    next: t?.next
  };
}, deleteCasts = async ({
  token: t,
  castHash: e
}) => {
  t = await (await fetchRetry("https://api.warpcast.com/v2/casts", {
    method: "DELETE",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3,
    body: {
      castHash: e
    }
  })).json();
  if (t?.errors) throw new WarpcastError(t?.errors);
  return {
    success: t?.result?.success
  };
}, getCastReactions = async ({
  token: t,
  castHash: e,
  limit: r,
  cursor: a
}) => {
  e = await (await fetchRetry(`https://api.warpcast.com/v2/cast-reactions?castHash=${e}&limit=` + r + (a ? "&cursor=" + a : ""), {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3
  })).json();
  if (e?.errors) throw new WarpcastError(e?.errors);
  return {
    reactions: e?.result?.reactions,
    next: e?.next
  };
}, getCastLikes = async ({
  token: t,
  castHash: e,
  limit: r,
  cursor: a
}) => {
  e = await (await fetchRetry(`https://api.warpcast.com/v2/cast-likes?castHash=${e}&limit=` + r + (a ? "&cursor=" + a : ""), {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3
  })).json();
  if (e?.errors) throw new WarpcastError(e?.errors);
  return {
    likes: e?.result?.likes,
    next: e?.next
  };
}, putCastLikes = async ({
  token: t,
  castHash: e
}) => {
  t = await (await fetchRetry("https://api.warpcast.com/v2/cast-likes", {
    method: "PUT",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3,
    body: {
      castHash: e
    }
  })).json();
  if (t?.errors) throw new WarpcastError(t?.errors);
  return {
    reaction: t?.result?.reaction
  };
}, deleteCastLikes = async ({
  token: t,
  castHash: e
}) => {
  t = await (await fetchRetry("https://api.warpcast.com/v2/cast-likes", {
    method: "DELETE",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3,
    body: {
      castHash: e
    }
  })).json();
  return {
    success: t?.result?.success,
    errors: t?.errors
  };
}, getCastRecasters = async ({
  token: t,
  castHash: e,
  limit: r,
  cursor: a
}) => {
  e = await (await fetchRetry(`https://api.warpcast.com/v2/cast-recasters?castHash=${e}&limit=` + r + (a ? "&cursor=" + a : ""), {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3
  })).json();
  if (e?.errors) throw new WarpcastError(e?.errors);
  return {
    users: e?.result?.users,
    next: e?.next
  };
}, putRecasts = async ({
  token: t,
  castHash: e
}) => {
  t = await (await fetchRetry("https://api.warpcast.com/v2/recasts", {
    method: "PUT",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3,
    body: {
      castHash: e
    }
  })).json();
  if (t?.errors) throw new WarpcastError(t?.errors);
  return {
    castHash: t?.result?.castHash
  };
}, deleteRecasts = async ({
  token: t,
  castHash: e
}) => {
  t = await (await fetchRetry("https://api.warpcast.com/v2/recasts", {
    method: "DELETE",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3,
    body: {
      castHash: e
    }
  })).json();
  if (t?.errors) throw new WarpcastError(t?.errors);
  return {
    success: t?.result?.success
  };
}, getFollowers = async ({
  token: t,
  fid: e,
  limit: r,
  cursor: a
}) => {
  e = await (await fetchRetry(`https://api.warpcast.com/v2/followers?fid=${e}&limit=` + r + (a ? "&cursor=" + a : ""), {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3
  })).json();
  if (e?.errors) throw new WarpcastError(e?.errors);
  return {
    users: e?.result?.users,
    next: e?.next
  };
}, putFollowing = async ({
  token: t,
  castHash: e
}) => {
  t = await (await fetchRetry("https://api.warpcast.com/v2/following", {
    method: "PUT",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3,
    body: {
      castHash: e
    }
  })).json();
  if (t?.errors) throw new WarpcastError(t?.errors);
  return {
    castHash: t?.result?.castHash
  };
}, deleteFollowing = async ({
  token: t,
  castHash: e
}) => {
  t = await (await fetchRetry("https://api.warpcast.com/v2/following", {
    method: "DELETE",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3,
    body: {
      castHash: e
    }
  })).json();
  if (t?.errors) throw new WarpcastError(t?.errors);
  return {
    success: t?.result?.success
  };
}, getFollowing = async ({
  token: t,
  fid: e,
  limit: r,
  cursor: a
}) => {
  e = await (await fetchRetry(`https://api.warpcast.com/v2/following?fid=${e}&limit=` + r + (a ? "&cursor=" + a : ""), {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3
  })).json();
  if (e?.errors) throw new WarpcastError(e?.errors);
  return {
    users: e?.result?.users,
    next: e?.next
  };
}, getCurrentUser = async ({
  token: t
}) => {
  t = await (await fetchRetry("https://api.warpcast.com/v2/me", {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3
  })).json();
  if (t?.errors) throw new WarpcastError(t?.errors);
  return {
    user: t?.result?.user
  };
}, getUser = async ({
  token: t,
  fid: e
}) => {
  e = await (await fetchRetry("https://api.warpcast.com/v2/user?fid=" + e, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3
  })).json();
  if (e?.errors) throw new WarpcastError(e?.errors);
  return {
    user: e?.result?.user
  };
}, getUserByUsername = async ({
  token: t,
  username: e
}) => {
  e = await (await fetchRetry("https://api.warpcast.com/v2/user-by-username?username=" + e, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3
  })).json();
  if (e?.errors) throw new WarpcastError(e?.errors);
  return {
    user: e?.result?.user
  };
}, getMentionAndReplyNotifications = async ({
  token: t,
  limit: e,
  cursor: r
}) => {
  e = await (await fetchRetry("https://api.warpcast.com/v2/mention-and-reply-notifications?limit=" + e + (r ? "&cursor=" + r : ""), {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: "Bearer " + t
    },
    timeout: 5e3
  })).json();
  if (e?.errors) throw new WarpcastError(e?.errors);
  return {
    notifications: e?.result?.notifications,
    next: e?.next
  };
};

module.exports = {
  getAllRecentCasts: getAllRecentCasts,
  getCast: getCast,
  getCasts: getCasts,
  postCasts: postCasts,
  deleteCasts: deleteCasts,
  getCastReactions: getCastReactions,
  getCastLikes: getCastLikes,
  putCastLikes: putCastLikes,
  deleteCastLikes: deleteCastLikes,
  getCastRecasters: getCastRecasters,
  putRecasts: putRecasts,
  deleteRecasts: deleteRecasts,
  getFollowers: getFollowers,
  putFollowing: putFollowing,
  deleteFollowing: deleteFollowing,
  getFollowing: getFollowing,
  getUser: getUser,
  getUserByUsername: getUserByUsername,
  getMentionAndReplyNotifications: getMentionAndReplyNotifications,
  getAllCastsInThread: getAllCastsInThread,
  getCustodyAddress: getCustodyAddress,
  getCurrentUser: getCurrentUser
};
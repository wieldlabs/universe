const app = require("express").Router(), axios = require("axios").default, Sentry = require("@sentry/node"), getAddressFromEnsOrAddress = require("../helpers/get-address-from-ens")["getAddressFromEnsOrAddress"], {
  resolveEnsDataFromAddress,
  resolveEnsFromAddress
} = require("../helpers/resolve-ens-data-from-address");

app.get("/ens-or-address/:ens_or_address", async (s, e) => {
  s = s.params.ens_or_address;
  if (!s) return e.json({
    code: 404,
    success: !1,
    message: "Not found"
  });
  try {
    var r = await getAddressFromEnsOrAddress(s), a = "eth" === s.slice(-3) ? s : await resolveEnsFromAddress(r);
    return e.json({
      code: 200,
      success: !0,
      address: r,
      ens: a
    });
  } catch (s) {
    return Sentry.captureException(s), console.error(s), e.json({
      code: 500,
      success: !1,
      message: s.message
    });
  }
}), app.get("/ens-or-address/public_ens_info/:ens_or_address", async (s, e) => {
  s = s.params.ens_or_address;
  if (!s) return e.json({
    code: 404,
    success: !1,
    message: "Not found"
  });
  try {
    var r = await resolveEnsDataFromAddress(s);
    return e.json({
      code: 200,
      success: !0,
      data: r
    });
  } catch (s) {
    return Sentry.captureException(s), console.error(s), e.json({
      code: 500,
      success: !1,
      message: s.message
    });
  }
}), app.get("/ens-or-address/public_info/:ens_or_address", async (s, e) => {
  s = s.params.ens_or_address;
  if (!s) return e.json({
    code: 404,
    success: !1,
    message: "Not found"
  });
  try {
    var r = await getAddressFromEnsOrAddress(s), a = axios.get("https://api.poap.xyz/actions/scan/" + r, {
      headers: {
        accept: "application/json"
      }
    }), o = axios.post("https://hub.snapshot.org/graphql", {
      headers: {
        "content-type": "application/json"
      },
      query: `
        query SpaceFollow {
            follows(
                first: 10,
                where: {
                follower: "${r}"
                }
            ) {
                space {
                id
                avatar
                name
                }
            }
        }`
    }), [ {
      data: d
    }, {
      data: t
    } ] = await Promise.all([ a, o ]);
    return e.json({
      code: 200,
      success: !0,
      address: r,
      poaps: d,
      spaces: t?.data?.follows || []
    });
  } catch (s) {
    return Sentry.captureException(s), console.error(s), e.json({
      code: 500,
      success: !1,
      message: s.message
    });
  }
}), module.exports = {
  router: app
};
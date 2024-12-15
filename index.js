require("./instrument");

const Sentry = require("@sentry/node"), dotenv = require("dotenv"), express = require("express"), resolvers = require("./graphql/resolvers")["resolvers"], loadSchemaSync = require("@graphql-tools/load")["loadSchemaSync"], GraphQLFileLoader = require("@graphql-tools/graphql-file-loader")["GraphQLFileLoader"], connectDB = require("./connectdb")["connectDB"], imageRouter = require("./express-routes/image")["router"], authRouter = require("./express-routes/auth")["router"], referralRouter = require("./express-routes/referral")["router"], utilsRouter = require("./express-routes/utils")["router"], communityRouter = require("./express-routes/community")["router"], metadataRouter = require("./express-routes/metadata")["router"], farcasterRouter = require("./express-routes/farcaster")["router"], analyticsRouter = require("./express-routes/farcaster/analytics")["router"], farcasterRpgRouter = require("./express-routes/farcaster/rpg")["router"], farcasterTcgRouter = require("./express-routes/farcaster/tcg")["router"], walletRouter = require("./express-routes/wallet")["router"], webhookRouter = require("./express-routes/webhook")["router"], wtfRouter = require("./express-routes/wtf")["router"], publicProfileRouter = require("./express-routes/ens-or-address")["router"], apiKeyRouter = require("./express-routes/apikey")["router"], accountRouter = require("./express-routes/account")["router"], frameRouter = require("./express-routes/frame")["router"], contractsRouter = require("./express-routes/contracts")["router"], opengraphRouter = require("./express-routes/opengraph")["router"], tokenRouter = require("./express-routes/farcaster/token")["router"], requireAuth = require("./helpers/auth-middleware")["requireAuth"], responseCachePlugin = require("@apollo/server-plugin-response-cache").default, ApolloServer = require("@apollo/server")["ApolloServer"], expressMiddleware = require("@apollo/server/express4")["expressMiddleware"], ApolloServerPluginDrainHttpServer = require("@apollo/server/plugin/drainHttpServer")["ApolloServerPluginDrainHttpServer"], http = require("http"), cors = require("cors"), json = require("body-parser")["json"], _RegistrarService = require("./services/RegistrarService")["Service"], port = parseInt(process.env.PORT, 10) || 8080, typeDefs = loadSchemaSync([ "./graphql/typeDefs/*.gql", "./graphql/typeDefs/**/*.gql" ], {
  loaders: [ new GraphQLFileLoader() ]
}), createDataLoaders = require("./graphql/dataloaders")["createDataLoaders"], app = express(), httpServer = (app.set("trust proxy", process.env.TRUST_PROXY_OVERRIDE || 2), 
http.createServer(app));

(async () => {
  var e = new ApolloServer({
    typeDefs: typeDefs,
    resolvers: resolvers,
    introspection: "development" === process.env.NODE_ENV,
    cache: "bounded",
    csrfPrevention: !0,
    formatError: (e, r) => (Sentry.captureException(r), new Error("Internal server error")),
    plugins: [ responseCachePlugin(), ApolloServerPluginDrainHttpServer({
      httpServer: httpServer
    }) ]
  });
  await e.start(), app.use("/graphql", cors(), json(), expressMiddleware(e, {
    context: async ({
      req: e
    }) => {
      var r = {
        dataloaders: createDataLoaders(),
        services: {
          RegistrarService: new _RegistrarService()
        }
      };
      try {
        var t = await requireAuth(e.headers.authorization || "");
        return {
          ...r,
          accountId: t.payload.id,
          isExternal: t.payload.isExternal,
          signerId: t.payload.signerId
        };
      } catch (e) {
        try {
          return e.message.includes("jwt must be provided") || (Sentry.captureException(e), 
          console.error(e)), {
            ...r
          };
        } catch (e) {
          return Sentry.captureException(e), console.error(e), {
            ...r
          };
        }
      }
    }
  })), app.get("/", (e, r) => {
    r.json({
      message: "Welcome to github.com/wieldlabs/superhub, see docs.wield.xyz for the API!"
    });
  }), app.get("/health", async (e, r) => {
    try {
      await connectDB(), r.status(200).send("Okay!");
    } catch (e) {
      r.status(500).send("Error!");
    }
  }), app.use("/webhook", webhookRouter), app.use(express.json()), app.use(function(e, r, t) {
    r.setHeader("Access-Control-Allow-Origin", "*"), r.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, sentry-trace, Accept, Authorization, baggage, API-KEY, signer, external"), 
    r.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"), 
    t();
  }), app.use("/image", imageRouter), app.use("/profile", publicProfileRouter), 
  app.use("/community", communityRouter), app.use("/metadata", metadataRouter), 
  app.use("/utils", utilsRouter), app.use("/referral", referralRouter), app.use("/farcaster", farcasterRouter), 
  app.use("/analytics", analyticsRouter), app.use("/farcaster/rpg", farcasterRpgRouter), 
  app.use("/farcaster/tcg", farcasterTcgRouter), app.use("/wallet", walletRouter), 
  app.use("/apikey", apiKeyRouter), app.use("/auth", authRouter), app.use("/account", accountRouter), 
  app.use("/frame", frameRouter), app.use("/wtf", wtfRouter), app.use("/contracts", contractsRouter), 
  app.use("/opengraph", opengraphRouter), app.use("/tokens", tokenRouter), Sentry.setupExpressErrorHandler(app), 
  require("yargs").command("$0", "Start your Superhub", e => {
    e.option("self-hosted", {
      type: "boolean",
      default: !1,
      description: "Run Superhub in self-hosted mode"
    }), e.option("bypass-prod-env-check-emergency", {
      type: "boolean",
      default: !1,
      description: "Bypass the production environment check"
    });
  }, async e => {
    dotenv.config(), process.env.MODE = e.selfHosted ? "self-hosted" : "default";
    let r = [ "JWT_SECRET", "MONGO_URL", "NODE_ENV" ];
    var t = [ "FARCAST_KEY" ];
    if ("self-hosted" === process.env.MODE ? console.log("Superhub is running in self-hosted mode! 😎") : (console.log("Superhub is running in default mode! 👀"), 
    r = r.concat([ "EXPO_ACCESS_TOKEN", "BEB_FARCASTER_APP_TOKEN", "SENTRY_DSN", "HOMESTEAD_NODE_URL" ])), 
    "production" !== process.env.NODE_ENV && !e.bypassProdEnvCheckEmergency && t.some(e => process.env[e])) return console.error(t.join(", ") + " is set. Remove it from your .env file! Or use --bypass-prod-env-check-emergency"), 
    !0;
    0 < r.filter(e => {
      if (!process.env[e]) return console.error(e + " is not set. Please set it (e.g. .env file)!"), 
      !0;
    }).length && (console.error("Exiting..."), process.exit(1)), "change-this" === process.env.JWT_SECRET && (console.error("Please change your JWT_SECRET from the default! (e.g. .env file)"), 
    process.exit(1)), await connectDB(), await new Promise(e => httpServer.listen({
      port: port
    }, e)), console.log(`🚀 Superhub is running at http://localhost:${port}/graphql`);
  }).argv;
})();
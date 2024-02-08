const Sentry = require("@sentry/node"), dotenv = require("dotenv"), express = require("express"), resolvers = require("./graphql/resolvers")["resolvers"], loadSchemaSync = require("@graphql-tools/load")["loadSchemaSync"], GraphQLFileLoader = require("@graphql-tools/graphql-file-loader")["GraphQLFileLoader"], connectDB = require("./connectdb")["connectDB"], imageRouter = require("./express-routes/image")["router"], authRouter = require("./express-routes/auth")["router"], referralRouter = require("./express-routes/referral")["router"], utilsRouter = require("./express-routes/utils")["router"], communityRouter = require("./express-routes/community")["router"], metadataRouter = require("./express-routes/metadata")["router"], farcasterRouter = require("./express-routes/farcaster")["router"], walletRouter = require("./express-routes/wallet")["router"], webhookRouter = require("./express-routes/webhook")["router"], publicProfileRouter = require("./express-routes/ens-or-address")["router"], apiKeyRouter = require("./express-routes/apikey")["router"], accountRouter = require("./express-routes/account")["router"], frameRouter = require("./express-routes/frame")["router"], requireAuth = require("./helpers/auth-middleware")["requireAuth"], responseCachePlugin = require("@apollo/server-plugin-response-cache").default, ApolloServer = require("@apollo/server")["ApolloServer"], expressMiddleware = require("@apollo/server/express4")["expressMiddleware"], ApolloServerPluginDrainHttpServer = require("@apollo/server/plugin/drainHttpServer")["ApolloServerPluginDrainHttpServer"], http = require("http"), cors = require("cors"), json = require("body-parser")["json"], _RegistrarService = require("./services/RegistrarService")["Service"], port = parseInt(process.env.PORT, 10) || 8080, typeDefs = loadSchemaSync([ "./graphql/typeDefs/*.gql", "./graphql/typeDefs/**/*.gql" ], {
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
    formatError: (e, r) => (Sentry.captureException(r), console.error(r), new Error("Internal server error")),
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
        var t = await requireAuth(e.headers.authorization?.slice(7) || "");
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
      message: "Welcome to a Wield Dimensions Host running github.com/wieldlabs/universe, see /graphql for the API!"
    });
  }), app.get("/health", async (e, r) => {
    try {
      await connectDB(), r.status(200).send("Okay!");
    } catch (e) {
      r.status(500).send("Error!");
    }
  }), app.use(express.json()), app.use(function(e, r, t) {
    r.setHeader("Access-Control-Allow-Origin", "*"), r.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, sentry-trace, Accept, Authorization, baggage, API-KEY, signer"), 
    t();
  }), app.use("/image", imageRouter), app.use("/profile", publicProfileRouter), 
  app.use("/community", communityRouter), app.use("/metadata", metadataRouter), 
  app.use("/utils", utilsRouter), app.use("/referral", referralRouter), app.use("/farcaster", farcasterRouter), 
  app.use("/wallet", walletRouter), app.use("/apikey", apiKeyRouter), app.use("/auth", authRouter), 
  app.use("/account", accountRouter), app.use("/webhook", webhookRouter), app.use("/frame", frameRouter), 
  require("yargs").command("$0", "Start your Universe", e => {
    e.option("self-hosted", {
      type: "boolean",
      default: !1,
      description: "Run Universe in self-hosted mode"
    }), e.option("env", {
      type: "string",
      default: ".env",
      description: "Path to .env file"
    });
  }, async e => {
    dotenv.config({
      path: e.env
    }), process.env.MODE = e.selfHosted ? "self-hosted" : "default", process.env.SENTRY_DSN && Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: 1
    });
    let r = [ "JWT_SECRET", "MONGO_URL", "NODE_ENV" ];
    "self-hosted" === process.env.MODE ? console.log("Universe is running in self-hosted mode! 😎") : (console.log("Universe is running in default mode! 👀"), 
    r = r.concat([ "IMGUR_CLIENT_ID", "MAGIC_LINK_SECRET", "IMGUR_CLIENT_ID", "EXPO_ACCESS_TOKEN", "BEB_FARCASTER_APP_TOKEN", "SENTRY_DSN", "HOMESTEAD_NODE_URL" ])), 
    0 < r.filter(e => {
      if (!process.env[e]) return console.error(e + " is not set. Please set it (e.g. .env file)!"), 
      !0;
    }).length && (console.error("Exiting..."), process.exit(1)), "change-this" === process.env.JWT_SECRET && (console.error("Please change your JWT_SECRET from the default! (e.g. .env file)"), 
    process.exit(1)), await connectDB(), await new Promise(e => httpServer.listen({
      port: port
    }, e)), console.log(`🚀 Universe is running at http://localhost:${port}/graphql`);
  }).argv;
})();
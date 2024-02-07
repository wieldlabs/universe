# Wield Universe

<img src="./.misc/header.png" width="300" />

Universes are open-source hosts for
[Wield, making crypto exploration fun](https://wield.co), used for apps such as
[far.quest](https://far.quest) and [Cast](https://far.quest/cast).

This is an early work that is subject to heavy changes, see our
[Github Issues](https://github.com/wieldlabs/dimension/issues) if you wish to
contribute.

**See our developer documents at [`docs.wield.co`](https://docs.wield.co).**

## Self-hosting Your Universe

We've provided a starter `Dockerfile` for you, with `MONGO_URL` and `JWT_SECRET`
as `ARG` parameters.

1. You'll need a MongoDB server, either by deploying MongoDB yourself or using a
   hosted solution such as [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. You'll also need to deploy this Dockerfile to a hosting location of your
   preference ([Railway](https://railway.app),
   [Heroku](https://www.heroku.com/), etc).
3. Once you have a hosted url, you can set this path in the BEBverse
   [resolver smart contracts](https://github.com/wieldlabs/contracts). For
   example, `foo.cast` would resolve to your host at
   `example-load-balancer-1234567890.us-west-2.elb.amazonaws.com`. See our
   [self-hosting guide](https://docs.wield.co/selfhosting#configuring-the-resolver-contract)
   for more details!

## Contribution Guidelines

The **wieldlabs/universe** repo follows the
[conventional commits guidelines](https://www.conventionalcommits.org/en/v1.0.0/#summary),
please be sure to respect them when committing.

When opening a Pull Request and you are not already a core contributor to
[@wieldlabs](https://github.com/wieldlabs), be sure to explain your pull request
in greater detail so there's less churn when reviewing and we can get your
changes landed ASAP, thank you!

## Developing in the wieldlabs/universe repo

Welcome to the setup guide for Universe! To start, you'll need
[node.js](https://github.com/nvm-sh/nvm),
[yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable), and
[mongodb](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-os-x/)
configured locally.

Once you have node.js, yarn and mongodb, you'll need to fill the following
environment variables to have a fully operational Wield instance on localhost:

### .env file setup

```
NODE_ENV=production
MONGO_URL=mongodb+srv://... # your local mongo url
JWT_SECRET=change-this
```

Once your environment is configured, run `yarn dev --self-hosted` to have a
running instance, and play around with graphql commands at
`localhost:8080/graphql`!

## Useful Links

- [Register a Wield Dimension](https://wield.co)
- [Protocol Documentation](https://docs.wield.co)

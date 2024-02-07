FROM node:buster-slim

# For mongodb, there are various hosting strategies:
# 1. Use a mongodb hosting service like Atlas: https://www.mongodb.com/cloud/atlas
# 2. Use a platform like Railway: https://railway.app
# 3. Host a mongodb server on your own server
ARG MONGO_URL
# Set your JWT secret to something random and private!
ARG JWT_SECRET
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y build-essential python3 git make wget gcc libc6-dev

# Copy package.json to the working directory
WORKDIR '/bebxyz_server'
COPY package.json /bebxyz_server

# Install any needed packages specified in package.json
RUN yarn install --ignore-scripts

# Copying the rest of the code to the working directory
COPY . /bebxyz_server

EXPOSE 8080

# Run app in self-hosted mode when the container launches
CMD ["yarn", "start", "--self-hosted"]

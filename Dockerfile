# 1. Use the specific Node.js version as the base image
FROM node:20.9.0 AS builder

# 2. Set working directory inside the container
WORKDIR /app

# 3. Define build-time variables (ARG)
ARG MONGODB_URI
ARG cryptoKey
ARG PAPERTRAIL_API_TOKEN
ARG AWS_KEY
ARG AWS_ACCESS_KEY
ARG PUBLIC_KEY
ARG PRIVATE_KEY
ARG NEW_RELIC_APP_NAME
ARG NEW_RELIC_LICENSE_KEY
ARG NEW_RELIC_LOG
ARG NEW_RELIC_NO_CONFIG_FILE
ARG NEW_RELIC_ENABLED

# 4. Set environment variables (ENV) for runtime
ENV MONGODB_URI=$MONGODB_URI \
    cryptoKey=$cryptoKey \
    PAPERTRAIL_API_TOKEN=$PAPERTRAIL_API_TOKEN \
    AWS_KEY=$AWS_KEY \
    AWS_ACCESS_KEY=$AWS_ACCESS_KEY \
    PUBLIC_KEY=$PUBLIC_KEY \
    PRIVATE_KEY=$PRIVATE_KEY \
    NEW_RELIC_APP_NAME=$NEW_RELIC_APP_NAME \
    NEW_RELIC_LICENSE_KEY=$NEW_RELIC_LICENSE_KEY \
    NEW_RELIC_LOG=$NEW_RELIC_LOG \
    NEW_RELIC_NO_CONFIG_FILE=$NEW_RELIC_NO_CONFIG_FILE \
    NEW_RELIC_ENABLED=$NEW_RELIC_ENABLED
    
#test
# 3. Copy package.json and package-lock.json
COPY package*.json ./

# 4. Install dependencies using the specified npm version
RUN npm install -g npm@10.1.0 && npm install

# 5. Copy all application files
COPY . .

# 6. Build the Nest.js app
RUN npm run build

# 7. Production image
FROM node:20.11.0 AS production

# 8. Set working directory inside the production container
WORKDIR /app

# 9. Copy only the necessary files from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# 10. Environment variable for production
ENV NODE_ENV=production

# 11. Expose the port
EXPOSE 3000

# 12. Start the Nest.js app
CMD ["node", "dist/main"]
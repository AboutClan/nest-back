# 1. Use the specific Node.js version as the base image
FROM node:20.9.0 AS builder

# 2. Set working directory inside the container
WORKDIR /app

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

USER root

RUN apt-get update && \
    apt-get install -y mongodb-database-tools && \
    rm -rf /var/lib/apt/lists/*

# 보안을 위해 다시 non-root 사용자인 'node'로 전환합니다.
USER node

# 8. Set working directory inside the production container
WORKDIR /app

# 9. Copy only the necessary files from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# 10. Environment variable for production
ENV NODE_ENV=production
    
# 11. Expose the port
EXPOSE 3001

# 12. Start the Nest.js app
CMD ["node", "dist/main"]
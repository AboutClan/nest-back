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

# Add the MongoDB repository and install the tools
RUN apt-get update && \
    # 1. Install necessary packages (gnupg, curl)
    apt-get install -y gnupg curl && \
    # 2. Download and add the MongoDB GPG key
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
       gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg && \
    # 3. Add MongoDB's apt repository source
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list && \
    # 4. Update package lists again with the new repository
    apt-get update && \
    # 5. Install mongodb-database-tools
    apt-get install -y mongodb-database-tools && \
    # 6. Clean up unnecessary files and cache to reduce image size
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Switch back to the non-root 'node' user for security
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
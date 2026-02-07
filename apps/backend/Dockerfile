FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY apps/backend/package.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY apps/backend/src ./src
COPY apps/backend/tsconfig.json ./

# Install dev dependencies for build
RUN npm install typescript tsx

# Build the app
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose port
EXPOSE 8080

# Start the app
CMD ["npm", "start"]

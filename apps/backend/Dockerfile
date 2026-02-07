# Multi-stage build to ensure isolation
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package.json (no lock files)
COPY package.json ./

# Clean install with npm (ignore any existing lock files)
RUN npm install --no-package-lock --production

# Install dev dependencies for build
RUN npm install --no-package-lock --save-dev typescript tsx

FROM node:20-alpine AS builder

WORKDIR /app

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src

# Build the app
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

# Copy built app
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

USER nodejs

# Expose port
EXPOSE 8080

# Start the app
CMD ["npm", "start"]

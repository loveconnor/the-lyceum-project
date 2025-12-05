FROM node:20-alpine

WORKDIR /app

# Copy root package files and config
COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json apps/backend/

# Install dependencies
RUN npm install

# Copy source code
COPY apps/backend apps/backend
COPY packages packages

# Build backend
RUN npm run build --workspace=apps/backend

CMD ["npm", "start", "--workspace=apps/backend"]

# Stage 1: Build the client
FROM node:20-slim AS builder

WORKDIR /app

# Install root dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Install client dependencies and build
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN npm run build

# Stage 2: Production server
FROM node:20-slim

# Install Chromium dependencies for Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libgbm1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libcups2 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install server dependencies
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev

# Copy server source and built client
COPY server/ ./server/
COPY --from=builder /app/client/dist ./client/dist

# Copy root package.json for npm start
COPY package.json ./

# Create non-root user and data directory
RUN useradd -m appuser && mkdir -p /app/data && chown -R appuser:appuser /app
USER appuser

# Cloud Run sets PORT automatically
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/index.js"]

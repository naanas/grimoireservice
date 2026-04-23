# Gunakan image Node 20 (Slim untuk kompatibilitas Prisma C-library)
FROM node:20-slim AS builder

WORKDIR /app

# Copy definisi dependency
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies yang dibutuhkan Prisma (OpenSSL dkk)
RUN apt-get update && apt-get install -y openssl ca-certificates

# Install semua deps (termasuk devDependencies untuk tsc) dan generate prisma
RUN npm ci

# Copy seluruh source code
COPY . .

# Build typescript ke folder dist/
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-slim

WORKDIR /app

# Install openssl di production untuk Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package.json dan node_modules yang sudah terinstall dari stage builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Set environment variables standard Cloud Run
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Jalankan server dari hasil build
CMD ["npm", "start"]

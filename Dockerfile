# Gunakan image Node 20 (Alpine untuk ukuran kecil)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy definisi dependency
COPY package*.json ./
COPY prisma ./prisma/

# Install semua deps (termasuk devDependencies untuk tsc) dan generate prisma
RUN npm ci

# Copy seluruh source code
COPY . .

# Build typescript ke folder dist/
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

WORKDIR /app

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

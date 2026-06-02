# ===== Stage 1: Build =====
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files trước để tận dụng Docker layer cache
COPY package*.json ./
RUN npm ci --only=production=false

# Copy source và build
COPY . .
RUN npm run build

# ===== Stage 2: Runtime =====
FROM node:20-alpine

WORKDIR /app

# Chỉ copy những thứ cần thiết để chạy production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 8081

CMD ["node", "dist/main"]

# ===== Stage 1: Build =====
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Copy dependency files trước để tận dụng Docker layer cache
COPY go.mod go.sum ./
RUN go mod download

# Copy toàn bộ source và build binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o gateway ./cmd/gateway

# ===== Stage 2: Runtime =====
# Dùng image tối giản — không có shell, không có package thừa
FROM scratch

WORKDIR /app

# Copy binary và file config từ stage build
COPY --from=builder /app/gateway .
COPY --from=builder /app/gateway.json .

# Chứng chỉ TLS cho HTTPS calls ra ngoài (cần thiết khi gọi external service)
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

EXPOSE 8080

ENTRYPOINT ["./gateway"]

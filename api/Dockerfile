# =============================================================================
# Revalyze API - Production Dockerfile
# =============================================================================
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# =============================================================================
# Production image
# =============================================================================
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates, chromium for headless browser, and dependencies
RUN apk --no-cache add \
    ca-certificates \
    tzdata \
    chromium \
    chromium-chromedriver \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ttf-freefont

# Set Chromium environment variables for chromedp
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/lib/chromium/

# Copy binary from builder
COPY --from=builder /app/server .
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/internal/config/pricing_elasticity.json ./internal/config/

# Expose port
EXPOSE 8080

# Run the application
CMD ["./server"]


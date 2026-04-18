# Build stage
# go mod tidy generates go.sum at build time so you don't need Go installed locally.
FROM golang:1.23-alpine AS builder
WORKDIR /app

COPY . .

# go mod tidy fetches deps and writes go.sum, then we build a static binary.
RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/api

# Runtime stage
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/server .

EXPOSE 8080
CMD ["./server"]

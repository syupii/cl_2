# Root-level Dockerfile for Render deployment.
# Build context is the repo root; source is in ./backend.

# ── Stage 1: builder ────────────────────────────────────────────────────────
FROM golang:1.25-alpine AS builder

RUN apk --no-cache add ca-certificates git

WORKDIR /app

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath -ldflags="-s -w" -o /api ./cmd/api

# ── Stage 2: runtime ────────────────────────────────────────────────────────
FROM alpine:3.21

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=builder /api ./api

EXPOSE 8080
ENTRYPOINT ["./api"]

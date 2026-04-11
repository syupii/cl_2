# ── Stage 1: builder ────────────────────────────────────────────────────────
FROM golang:1.25-alpine AS builder

# Install certificates so the binary can make TLS calls (e.g. Supabase).
RUN apk --no-cache add ca-certificates git

WORKDIR /app

# Download dependencies first (layer-cached unless go.mod/sum change).
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build a statically-linked binary.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath -ldflags="-s -w" -o /api ./cmd/api

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM alpine:3.21

# ca-certificates is needed for outbound HTTPS (Supabase Auth, etc.).
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=builder /api ./api

# Railway injects PORT at runtime; the app reads it via os.Getenv("PORT").
EXPOSE 8080

ENTRYPOINT ["./api"]

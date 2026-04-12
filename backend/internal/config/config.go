// Package config loads runtime configuration from environment variables.
//
// The backend reads secrets (Supabase JWT secret, Postgres URL) and tunables
// (port, allowed origins, FX rates) from the process environment. A .env file
// in the backend working directory is loaded automatically for local dev.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
	"github.com/shopspring/decimal"
)

// Config is the fully-validated runtime configuration.
type Config struct {
	// HTTP
	Port           string
	AllowedOrigins []string

	// Database
	DatabaseURL string

	// Supabase Auth
	JWTSecret string
	// JWTIssuer is optional; when set the middleware verifies the iss claim.
	JWTIssuer string
	// JWTAudience is the expected "aud" claim. Supabase default is "authenticated".
	JWTAudience string

	// AdminEmail is the email address of the user who can manage templates.
	// Set via ADMIN_EMAIL env var. Leave empty to disable admin endpoints.
	AdminEmail string

	// Foreign exchange. Base currency is JPY.
	// FXRates maps an ISO-4217 currency code to "how many JPY per 1 unit".
	FXRates map[string]decimal.Decimal
}

// Load reads configuration from the environment. Any missing required value
// returns an error so main.go can fail fast at startup rather than crashing
// mid-request with nil dereferences.
func Load() (*Config, error) {
	// Best-effort .env load. Missing file is not an error.
	_ = godotenv.Load()

	cfg := &Config{
		Port:           getEnv("PORT", "8080"),
		AllowedOrigins: splitCSV(getEnv("ALLOWED_ORIGINS", "http://localhost:3000")),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		JWTSecret:      os.Getenv("SUPABASE_JWT_SECRET"),
		JWTIssuer:      os.Getenv("SUPABASE_JWT_ISSUER"),
		JWTAudience:    getEnv("SUPABASE_JWT_AUDIENCE", "authenticated"),
		AdminEmail:     strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL"))),
		FXRates:        defaultFXRates(),
	}

	// Layered FX overrides via FX_RATES="USD=150.25,EUR=162.10"
	if raw := os.Getenv("FX_RATES"); raw != "" {
		parsed, err := parseFXRates(raw)
		if err != nil {
			return nil, fmt.Errorf("config: invalid FX_RATES: %w", err)
		}
		for code, rate := range parsed {
			cfg.FXRates[code] = rate
		}
	}

	if cfg.DatabaseURL == "" {
		return nil, errors.New("config: DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		return nil, errors.New("config: SUPABASE_JWT_SECRET is required")
	}
	if _, err := strconv.Atoi(cfg.Port); err != nil {
		return nil, fmt.Errorf("config: PORT must be numeric, got %q", cfg.Port)
	}

	return cfg, nil
}

func defaultFXRates() map[string]decimal.Decimal {
	// Fixed reference rates for the MVP per REQUIREMENTS.md section 3.C.
	// Override individual currencies at runtime via FX_RATES env var.
	return map[string]decimal.Decimal{
		"JPY": decimal.NewFromInt(1),
		"USD": decimal.NewFromInt(150),
		"EUR": decimal.NewFromInt(162),
		"GBP": decimal.NewFromInt(190),
	}
}

func parseFXRates(raw string) (map[string]decimal.Decimal, error) {
	out := make(map[string]decimal.Decimal)
	for _, pair := range strings.Split(raw, ",") {
		pair = strings.TrimSpace(pair)
		if pair == "" {
			continue
		}
		kv := strings.SplitN(pair, "=", 2)
		if len(kv) != 2 {
			return nil, fmt.Errorf("malformed pair %q", pair)
		}
		code := strings.ToUpper(strings.TrimSpace(kv[0]))
		value := strings.TrimSpace(kv[1])
		rate, err := decimal.NewFromString(value)
		if err != nil {
			return nil, fmt.Errorf("currency %s: %w", code, err)
		}
		if rate.IsNegative() || rate.IsZero() {
			return nil, fmt.Errorf("currency %s: rate must be positive", code)
		}
		out[code] = rate
	}
	return out, nil
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func splitCSV(s string) []string {
	raw := strings.Split(s, ",")
	out := make([]string, 0, len(raw))
	for _, item := range raw {
		item = strings.TrimSpace(item)
		if item != "" {
			out = append(out, item)
		}
	}
	return out
}

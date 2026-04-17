// Package auth verifies Supabase Auth JWT tokens presented in the
// Authorization header and injects the authenticated user ID into the
// request context so handlers and sqlc queries can scope every operation
// to that user.
//
// Supabase issues JWTs signed with either HS256 (legacy projects) or ES256
// (new projects using asymmetric keys). We auto-detect by fetching the JWKS
// endpoint derived from SUPABASE_JWT_ISSUER at startup.
package auth

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/syupii/cl_2/backend/internal/httpx"
)

// ctxKey is an unexported type to prevent context key collisions.
type ctxKey struct{}

var userKey ctxKey

// User holds the subset of Supabase JWT claims the API cares about.
type User struct {
	ID    uuid.UUID
	Email string
	Role  string
}

// WithUser stores the authenticated user in the context.
func WithUser(ctx context.Context, u User) context.Context {
	return context.WithValue(ctx, userKey, u)
}

// UserFromContext returns the user injected by the middleware.
func UserFromContext(ctx context.Context) (User, bool) {
	u, ok := ctx.Value(userKey).(User)
	return u, ok
}

// MustUserID is a convenience for handlers that already live behind the middleware.
func MustUserID(ctx context.Context) uuid.UUID {
	u, ok := UserFromContext(ctx)
	if !ok {
		panic("auth: user not present in context (middleware missing?)")
	}
	return u.ID
}

// Verifier encapsulates the configuration required to validate Supabase JWTs.
type Verifier struct {
	Secret   []byte           // for HS256 (legacy Supabase)
	ECKey    *ecdsa.PublicKey // for ES256 (new Supabase); nil if JWKS unavailable
	Issuer   string
	Audience string
}

// jwksResponse is the minimal shape of a JWKS JSON document.
type jwksResponse struct {
	Keys []struct {
		Kty string `json:"kty"`
		Crv string `json:"crv"`
		X   string `json:"x"`
		Y   string `json:"y"`
	} `json:"keys"`
}

// fetchECKey retrieves the first EC P-256 public key from a JWKS endpoint.
// Returns nil, nil when the endpoint has no EC keys (not an error).
func fetchECKey(jwksURL string) (*ecdsa.PublicKey, error) {
	resp, err := http.Get(jwksURL) //nolint:noctx
	if err != nil {
		return nil, fmt.Errorf("fetching JWKS: %w", err)
	}
	defer resp.Body.Close()

	var jwks jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return nil, fmt.Errorf("decoding JWKS: %w", err)
	}

	for _, k := range jwks.Keys {
		if k.Kty != "EC" || k.Crv != "P-256" {
			continue
		}
		xBytes, err := base64.RawURLEncoding.DecodeString(k.X)
		if err != nil {
			continue
		}
		yBytes, err := base64.RawURLEncoding.DecodeString(k.Y)
		if err != nil {
			continue
		}
		return &ecdsa.PublicKey{
			Curve: elliptic.P256(),
			X:     new(big.Int).SetBytes(xBytes),
			Y:     new(big.Int).SetBytes(yBytes),
		}, nil
	}
	return nil, nil // no EC key present, HS256-only mode
}

// NewVerifier validates its inputs and returns a ready-to-use Verifier.
// If issuer is set, it attempts to load ES256 public key via JWKS.
// JWKS failure is non-fatal; the verifier falls back to HS256-only mode.
func NewVerifier(secret, issuer, audience string) (*Verifier, error) {
	if secret == "" {
		return nil, errors.New("auth: JWT secret must not be empty")
	}
	v := &Verifier{
		Secret:   []byte(secret),
		Issuer:   strings.TrimSpace(issuer),
		Audience: strings.TrimSpace(audience),
	}

	// Attempt ES256 key fetch from JWKS. JWKS outage is non-fatal so HS256
	// (legacy) projects keep working, but failures are logged loudly so ops
	// can tell whether an ES256-only project is silently running in HS256
	// fallback mode.
	if v.Issuer != "" {
		jwksURL := strings.TrimRight(v.Issuer, "/") + "/.well-known/jwks.json"
		key, err := fetchECKey(jwksURL)
		switch {
		case err != nil:
			log.Printf("auth: JWKS fetch failed (HS256-only mode): %v", err)
		case key == nil:
			log.Printf("auth: JWKS at %s has no EC P-256 key (HS256-only mode)", jwksURL)
		default:
			v.ECKey = key
		}
	}
	return v, nil
}

// supabaseClaims is the JWT payload shape Supabase emits for authenticated users.
type supabaseClaims struct {
	Email string `json:"email,omitempty"`
	Role  string `json:"role,omitempty"`
	jwt.RegisteredClaims
}

// Middleware returns a chi-compatible middleware that rejects requests
// without a valid bearer token and stores the extracted User in context.
func (v *Verifier) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			rawToken, err := bearerToken(r.Header.Get("Authorization"))
			if err != nil {
				httpx.Unauthorized(w, err.Error())
				return
			}

			user, err := v.verify(rawToken)
			if err != nil {
				httpx.Unauthorized(w, err.Error())
				return
			}

			ctx := WithUser(r.Context(), user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// verify parses and validates the token, returning the domain User.
func (v *Verifier) verify(raw string) (User, error) {
	validMethods := []string{"HS256"}
	if v.ECKey != nil {
		validMethods = append(validMethods, "ES256")
	}

	parser := jwt.NewParser(
		jwt.WithValidMethods(validMethods),
	)

	token, err := parser.ParseWithClaims(raw, &supabaseClaims{}, func(t *jwt.Token) (any, error) {
		switch t.Method.Alg() {
		case "HS256":
			return v.Secret, nil
		case "ES256":
			if v.ECKey == nil {
				return nil, errors.New("ES256 key not available")
			}
			return v.ECKey, nil
		default:
			return nil, fmt.Errorf("unexpected signing method: %v", t.Method.Alg())
		}
	})
	if err != nil {
		return User{}, fmt.Errorf("invalid token: %w", err)
	}
	if !token.Valid {
		return User{}, errors.New("invalid token")
	}

	claims, ok := token.Claims.(*supabaseClaims)
	if !ok {
		return User{}, errors.New("invalid token claims")
	}

	if v.Issuer != "" && claims.Issuer != v.Issuer {
		return User{}, fmt.Errorf("unexpected issuer %q", claims.Issuer)
	}
	if v.Audience != "" {
		if !audienceContains(claims.Audience, v.Audience) {
			return User{}, fmt.Errorf("unexpected audience")
		}
	}

	if claims.Subject == "" {
		return User{}, errors.New("token missing sub claim")
	}
	uid, err := uuid.Parse(claims.Subject)
	if err != nil {
		return User{}, fmt.Errorf("sub claim is not a UUID: %w", err)
	}

	return User{
		ID:    uid,
		Email: claims.Email,
		Role:  claims.Role,
	}, nil
}

// bearerToken extracts the token from an "Authorization: Bearer ..." header.
func bearerToken(header string) (string, error) {
	if header == "" {
		return "", errors.New("missing Authorization header")
	}
	const prefix = "Bearer "
	if len(header) < len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
		return "", errors.New("Authorization header must be a Bearer token")
	}
	token := strings.TrimSpace(header[len(prefix):])
	if token == "" {
		return "", errors.New("empty bearer token")
	}
	return token, nil
}

func audienceContains(aud jwt.ClaimStrings, expected string) bool {
	for _, a := range aud {
		if a == expected {
			return true
		}
	}
	return false
}

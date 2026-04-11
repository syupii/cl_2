// Package auth verifies Supabase Auth JWT tokens presented in the
// Authorization header and injects the authenticated user ID into the
// request context so handlers and sqlc queries can scope every operation
// to that user.
//
// Supabase issues HS256 access tokens signed with the project's JWT secret.
// We verify with jwt/v5 and optionally validate the "iss" and "aud" claims.
package auth

import (
	"context"
	"errors"
	"fmt"
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
// The bool result is false when the middleware did not run, e.g. on public
// routes like /healthz.
func UserFromContext(ctx context.Context) (User, bool) {
	u, ok := ctx.Value(userKey).(User)
	return u, ok
}

// MustUserID is a convenience for handlers that already live behind the
// middleware; it panics only if the middleware was mis-wired (programmer
// error), which is fine because the recover middleware converts that to 500.
func MustUserID(ctx context.Context) uuid.UUID {
	u, ok := UserFromContext(ctx)
	if !ok {
		panic("auth: user not present in context (middleware missing?)")
	}
	return u.ID
}

// Verifier encapsulates the configuration required to validate Supabase JWTs.
type Verifier struct {
	Secret   []byte
	Issuer   string // optional
	Audience string // expected aud claim, typically "authenticated"
}

// NewVerifier validates its inputs and returns a ready-to-use Verifier.
func NewVerifier(secret, issuer, audience string) (*Verifier, error) {
	if secret == "" {
		return nil, errors.New("auth: JWT secret must not be empty")
	}
	return &Verifier{
		Secret:   []byte(secret),
		Issuer:   strings.TrimSpace(issuer),
		Audience: strings.TrimSpace(audience),
	}, nil
}

// supabaseClaims is the JWT payload shape Supabase emits for authenticated
// users. We only read the fields the API cares about.
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
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"HS256"}),
	)

	token, err := parser.ParseWithClaims(raw, &supabaseClaims{}, func(t *jwt.Token) (any, error) {
		return v.Secret, nil
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

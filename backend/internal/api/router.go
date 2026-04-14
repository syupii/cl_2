package api

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	httpSwagger "github.com/swaggo/http-swagger/v2"

	"github.com/syupii/cl_2/backend/internal/auth"
	"github.com/syupii/cl_2/backend/internal/httpx"
)

// RouterConfig contains every external dependency the chi router needs.
type RouterConfig struct {
	Handler        *Handler
	JWTVerifier    *auth.Verifier
	AllowedOrigins []string
}

// NewRouter assembles the chi router with middleware, /healthz, Swagger UI,
// and the authenticated /api/v1 routes.
func NewRouter(cfg RouterConfig) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Requested-With"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Security headers
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
			w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
			next.ServeHTTP(w, r)
		})
	})

	// Request body size limit (64 KB)
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body != nil {
				r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
			}
			next.ServeHTTP(w, r)
		})
	})

	// Public endpoints --------------------------------------------------------
	r.Get("/healthz", healthz)
	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
	))

	// Authenticated API under /api/v1 -----------------------------------------
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(cfg.JWTVerifier.Middleware())

		r.Get("/subscriptions", cfg.Handler.ListSubscriptions)
		r.Post("/subscriptions", cfg.Handler.CreateSubscription)
		r.Put("/subscriptions/{id}", cfg.Handler.UpdateSubscription)
		r.Delete("/subscriptions/{id}", cfg.Handler.DeleteSubscription)

		r.Get("/templates", cfg.Handler.ListTemplates)
		r.Put("/templates/plans/{id}", cfg.Handler.UpdatePlanPrice)

		r.Get("/summary", cfg.Handler.GetSummary)

		r.Get("/payment-methods", cfg.Handler.ListPaymentMethods)
		r.Post("/payment-methods", cfg.Handler.CreatePaymentMethod)
		r.Delete("/payment-methods/{id}", cfg.Handler.DeletePaymentMethod)
	})

	return r
}

// healthz is the unauthenticated liveness probe served at /healthz.
// It is intentionally NOT documented by swag because the Swagger spec uses
// basePath=/api/v1 while this endpoint lives at the server root.
func healthz(w http.ResponseWriter, _ *http.Request) {
	httpx.OK(w, http.StatusOK, HealthResponse{Status: "ok"})
}

// Package main is the HTTP API entrypoint for the subscription dashboard.
//
// It loads configuration from the environment, opens a pgx connection pool
// to Supabase Postgres, constructs the sqlc repository, wires the chi router
// with Supabase JWT middleware, and serves the API on the configured port.
//
// @title                       Subscription Dashboard API
// @version                     1.0
// @description                 Unified subscription management dashboard API.
// @description                 All /api/v1 endpoints require a Supabase JWT
// @description                 in the Authorization header.
// @BasePath                    /api/v1
// @securityDefinitions.apikey  BearerAuth
// @in                          header
// @name                        Authorization
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	// Blank import so swag-generated docs are registered with http-swagger.
	_ "github.com/syupii/cl_2/backend/docs"

	"github.com/syupii/cl_2/backend/internal/api"
	"github.com/syupii/cl_2/backend/internal/auth"
	"github.com/syupii/cl_2/backend/internal/config"
	"github.com/syupii/cl_2/backend/internal/money"
	"github.com/syupii/cl_2/backend/internal/repository"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("fatal: %v", err)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	// Connection pool. The background context lives for the life of the
	// process; individual requests use their own request-scoped context.
	poolCtx, poolCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer poolCancel()

	pool, err := pgxpool.New(poolCtx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if err := pool.Ping(poolCtx); err != nil {
		return err
	}

	repo := repository.New(pool)
	conv := money.NewConverter(cfg.FXRates)

	verifier, err := auth.NewVerifier(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience)
	if err != nil {
		return err
	}

	handler := api.NewHandler(repo, conv)
	router := api.NewRouter(api.RouterConfig{
		Handler:        handler,
		JWTVerifier:    verifier,
		AllowedOrigins: cfg.AllowedOrigins,
	})

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// Graceful shutdown on SIGINT / SIGTERM.
	errCh := make(chan error, 1)
	go func() {
		log.Printf("backend listening on %s", server.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	signalCh := make(chan os.Signal, 1)
	signal.Notify(signalCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return err
	case sig := <-signalCh:
		log.Printf("received %s, shutting down", sig)
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return err
	}
	return <-errCh
}

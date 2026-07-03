package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jomboy-lavka/admin-bff/internal/config"
	"github.com/jomboy-lavka/admin-bff/internal/db"
	"github.com/jomboy-lavka/admin-bff/internal/handlers"
	"github.com/jomboy-lavka/admin-bff/internal/migrate"
	"github.com/jomboy-lavka/pkg/metrics"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	var pool *pgxpool.Pool
	if cfg.DatabaseURL != "" {
		var err error
		pool, err = db.Connect(ctx, cfg.DatabaseURL)
		if err != nil {
			log.Fatalf("database: %v", err)
		}
		defer pool.Close()
		if err := migrate.Up(ctx, pool); err != nil {
			log.Fatalf("migrate: %v", err)
		}
	} else {
		log.Println("admin-bff: DEV_NO_DB — HQ/WMS in-memory mode")
	}

	router := handlers.NewRouter(cfg, pool)
	routerWithMetrics := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/metrics" {
			metrics.Handler("admin-bff")(w, r)
			return
		}
		router.ServeHTTP(w, r)
	})
	handler := cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Idempotency-Key"},
		AllowCredentials: true,
	})(routerWithMetrics)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("Jomboy Lavka Go API: http://localhost:%s/api/v1 (phase 5)", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}

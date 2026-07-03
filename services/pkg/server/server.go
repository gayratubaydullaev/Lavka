package server

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jomboy-lavka/pkg/config"
	"github.com/jomboy-lavka/pkg/httpx"
	"github.com/jomboy-lavka/pkg/metrics"
)

type Options struct {
	ServiceName string
	DefaultPort string
	Register    func(r chi.Router)
	Phase       int
	Extra       map[string]any
}

func Run(opts Options) {
	cfg := config.Load(opts.ServiceName, opts.DefaultPort)
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)
	r.Use(metrics.Middleware(cfg.Name))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Idempotency-Key"},
		AllowCredentials: true,
	}))

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		body := map[string]any{
			"status":  "ok",
			"service": cfg.Name,
			"phase":   opts.Phase,
			"backend": "go",
		}
		for k, v := range opts.Extra {
			body[k] = v
		}
		httpx.JSON(w, http.StatusOK, body)
	})

	r.Get("/metrics", metrics.Handler(cfg.Name))

	if opts.Register != nil {
		opts.Register(r)
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("%s listening on :%s", cfg.Name, cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}

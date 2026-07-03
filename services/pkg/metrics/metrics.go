package metrics

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

var (
	mu sync.Mutex
	reqTotal   = map[string]float64{}
	reqLatency = map[string][]float64{}
)

func Middleware(service string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			next.ServeHTTP(ww, r)
			route := r.URL.Path
			if route == "/health" || route == "/metrics" {
				return
			}
			key := service + "|" + r.Method + "|" + route + "|" + strconv.Itoa(ww.Status())
			mu.Lock()
			reqTotal[key]++
			reqLatency[service] = append(reqLatency[service], time.Since(start).Seconds())
			mu.Unlock()
		})
	}
}

func Handler(service string) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		mu.Lock()
		defer mu.Unlock()
		w.Write([]byte("# HELP jomboy_up Service availability\n"))
		w.Write([]byte("jomboy_up{service=\"" + service + "\"} 1\n"))
		w.Write([]byte("# HELP http_requests_total HTTP requests\n"))
		for k, v := range reqTotal {
			w.Write([]byte("http_requests_total{key=\"" + k + "\"} " + formatFloat(v) + "\n"))
		}
		w.Write([]byte("# TYPE http_request_duration_seconds histogram\n"))
		for svc, samples := range reqLatency {
			if len(samples) == 0 {
				continue
			}
			var sum float64
			for _, s := range samples {
				sum += s
			}
			w.Write([]byte("http_request_duration_seconds_sum{service=\"" + svc + "\"} " + formatFloat(sum) + "\n"))
			w.Write([]byte("http_request_duration_seconds_count{service=\"" + svc + "\"} " + formatFloat(float64(len(samples))) + "\n"))
		}
	}
}

func formatFloat(v float64) string {
	return strconv.FormatFloat(v, 'f', -1, 64)
}

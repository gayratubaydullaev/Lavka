package middleware

import (
	"net/http"
	"strings"
)

func Auth(devAuth bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !devAuth {
				next.ServeHTTP(w, r)
				return
			}
			path := r.URL.Path
			if path == "/api/v1/health" || strings.HasPrefix(path, "/api/v1/auth") {
				next.ServeHTTP(w, r)
				return
			}
			if r.Header.Get("Authorization") == "" {
				http.Error(w, `{"code":"UNAUTHORIZED","message":"Missing token"}`, http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

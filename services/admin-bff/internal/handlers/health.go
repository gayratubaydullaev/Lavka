package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type HealthHandler struct {
	Pool          *pgxpool.Pool
	DarkstoreID   string
}

func (h HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var skuTashkent, skuSamarkand int
	if h.Pool != nil {
		_ = h.Pool.QueryRow(r.Context(), `
			SELECT
				COUNT(*) FILTER (WHERE darkstore_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
				COUNT(*) FILTER (WHERE darkstore_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901')
			FROM products WHERE active = true
		`).Scan(&skuTashkent, &skuSamarkand)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":         "ok",
		"service":        "admin-bff",
		"phase":            5,
		"backend":        "go",
		"db":             "postgres",
		"darkstore_id":   h.DarkstoreID,
		"darkstores":     2,
		"sku_tashkent":   skuTashkent,
		"sku_samarkand":  skuSamarkand,
		"wms":            true,
		"ai":             true,
		"fiscal":        true,
		"webhooks":      true,
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]string{"code": code, "message": message})
}

func nowISO() string {
	return time.Now().UTC().Format(time.RFC3339)
}

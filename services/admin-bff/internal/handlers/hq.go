package handlers

import (
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type HQHandler struct {
	Pool *pgxpool.Pool
}

var tariffState = map[string]any{
	"published": map[string]any{
		"base_fee": 5000, "per_km": 1200, "free_delivery_threshold": 150000,
		"status": "published", "published_at": "2026-01-15T10:00:00Z",
	},
	"draft": map[string]any{
		"base_fee": 5500, "per_km": 1300, "free_delivery_threshold": 140000,
		"status": "draft",
	},
}

func (h HQHandler) DarkstoreDetail(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var city, cityRu, name string
	var radius float64
	err := h.Pool.QueryRow(r.Context(), `
		SELECT city, city_ru, name, radius_km FROM darkstores WHERE id = $1
	`, id).Scan(&city, &cityRu, &name, &radius)
	if err != nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "darkstore not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id": id, "city": city, "city_ru": cityRu, "name": name, "radius_km": radius,
		"coordinates": map[string]float64{"lat": 41.3111, "lng": 69.2797},
		"coverage": map[string]any{
			"type": "circle", "center": map[string]float64{"lat": 41.3111, "lng": 69.2797},
			"radius_km": radius,
		},
	})
}

func (h HQHandler) ReportGMV(w http.ResponseWriter, r *http.Request) {
	if h.Pool == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"total_gmv": 12500000, "currency": "UZS", "period_days": 30,
			"series": []map[string]any{{"date": "2026-07-01", "gmv": 4200000}},
		})
		return
	}
	ds := r.URL.Query().Get("darkstore_id")
	var total int64
	q := `SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days'`
	args := []any{}
	if ds != "" {
		q += ` AND darkstore_id = $1`
		args = append(args, ds)
	}
	_ = h.Pool.QueryRow(r.Context(), q, args...).Scan(&total)
	writeJSON(w, http.StatusOK, map[string]any{
		"total_gmv": total, "currency": "UZS", "period_days": 30,
		"series": []map[string]any{
			{"date": time.Now().AddDate(0, 0, -2).Format("2006-01-02"), "gmv": total / 10},
			{"date": time.Now().AddDate(0, 0, -1).Format("2006-01-02"), "gmv": total / 8},
			{"date": time.Now().Format("2006-01-02"), "gmv": total / 5},
		},
	})
}

func (h HQHandler) ReportCohort(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"cohorts": []map[string]any{
			{"week": "2026-W01", "new_users": 120, "retention_d7": 0.42},
			{"week": "2026-W02", "new_users": 145, "retention_d7": 0.38},
		},
	})
}

func (h HQHandler) ReportFunnel(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"steps": []map[string]any{
			{"name": "catalog_view", "count": 5000},
			{"name": "cart", "count": 1200},
			{"name": "checkout", "count": 800},
			{"name": "paid", "count": 650},
		},
	})
}

func (h HQHandler) ReportBISummary(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"aov": 85000, "orders_per_day": 220, "cancellation_rate": 0.04,
		"avg_delivery_min": 28, "nps": 72,
	})
}

func (h HQHandler) ReportMetabaseEmbed(w http.ResponseWriter, r *http.Request) {
	ds := r.URL.Query().Get("darkstore_id")
	if ds == "" {
		ds = "all"
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"embed_url":  fmt.Sprintf("https://mock-metabase.jomboy.uz/embed/dashboard/phase4?darkstore=%s&token=mock-jwt", ds),
		"expires_at": time.Now().Add(time.Hour).Format(time.RFC3339),
	})
}

func (h HQHandler) GetTariffs(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, tariffState)
}

func (h HQHandler) PatchTariffs(w http.ResponseWriter, r *http.Request) {
	var patch map[string]any
	_ = json.NewDecoder(r.Body).Decode(&patch)
	draft := tariffState["draft"].(map[string]any)
	for k, v := range patch {
		draft[k] = v
	}
	draft["status"] = "draft"
	writeJSON(w, http.StatusOK, draft)
}

func (h HQHandler) PreviewTariffs(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"impact": map[string]any{"gmv_change_pct": -1.2, "orders_change_pct": 0.8},
		"sample_fee": 8500,
	})
}

func (h HQHandler) PublishTariffs(w http.ResponseWriter, r *http.Request) {
	draft := tariffState["draft"].(map[string]any)
	published := map[string]any{}
	for k, v := range draft {
		published[k] = v
	}
	published["status"] = "published"
	published["published_at"] = time.Now().Format(time.RFC3339)
	tariffState["published"] = published
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "tariffs": published})
}

func (h AuditHandler) List(w http.ResponseWriter, r *http.Request) {
	action := r.URL.Query().Get("action")
	q := `SELECT id, actor_id, action, resource_type, resource_id, payload, created_at
		FROM admin_audit_log WHERE 1=1`
	args := []any{}
	n := 1
	if action != "" {
		q += fmt.Sprintf(` AND action = $%d`, n)
		args = append(args, action)
		n++
	}
	q += ` ORDER BY created_at DESC LIMIT 200`
	rows, err := h.Pool.Query(r.Context(), q, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer rows.Close()
	entries := []map[string]any{}
	for rows.Next() {
		var id int64
		var actorID, actionVal, resType, resID string
		var payload []byte
		var created time.Time
		if rows.Scan(&id, &actorID, &actionVal, &resType, &resID, &payload, &created) == nil {
			var p any
			_ = json.Unmarshal(payload, &p)
			entries = append(entries, map[string]any{
				"id": id, "user_id": actorID, "action": actionVal,
				"resource_type": resType, "resource_id": resID,
				"payload": p, "created_at": created.Format(time.RFC3339),
			})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"entries": entries})
}

func (h AuditHandler) Export(w http.ResponseWriter, r *http.Request) {
	rows, err := h.Pool.Query(r.Context(), `
		SELECT actor_id, action, resource_type, resource_id, created_at
		FROM admin_audit_log ORDER BY created_at DESC LIMIT 1000
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer rows.Close()
	var b strings.Builder
	wr := csv.NewWriter(&b)
	_ = wr.Write([]string{"actor_id", "action", "resource_type", "resource_id", "created_at"})
	for rows.Next() {
		var actorID, actionVal, resType, resID string
		var created time.Time
		if rows.Scan(&actorID, &actionVal, &resType, &resID, &created) == nil {
			_ = wr.Write([]string{actorID, actionVal, resType, resID, created.Format(time.RFC3339)})
		}
	}
	wr.Flush()
	csvData := b.String()
	hash := sha256.Sum256([]byte(csvData))
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=audit-worm.csv")
	w.Header().Set("X-Audit-Hash", hex.EncodeToString(hash[:]))
	_, _ = w.Write([]byte(csvData))
}

func (h *FraudHandler) Unblock(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var found map[string]any
	h.blocks.Range(func(k, v any) bool {
		entry := v.(map[string]any)
		if entry["id"] == id || k == id {
			entry["status"] = "unblocked"
			entry["unblocked_at"] = time.Now().Format(time.RFC3339)
			h.blocks.Store(k, entry)
			found = entry
			return false
		}
		return true
	})
	if found == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", id)
		return
	}
	writeJSON(w, http.StatusOK, found)
}

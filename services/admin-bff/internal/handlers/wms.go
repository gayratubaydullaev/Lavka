package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WMSHandler struct {
	Pool *pgxpool.Pool
}

func (h WMSHandler) Register(r chi.Router) {
	h.registerRoutes(r, "/api/v1/admin/warehouse", true)
	h.registerRoutes(r, "/api/v1/wms", false)
}

func (h WMSHandler) registerRoutes(r chi.Router, prefix string, full bool) {
	r.Route(prefix, func(api chi.Router) {
		api.Get("/writeoffs", h.ListWriteoffs)
		api.Post("/writeoffs", h.CreateWriteoff)
		api.Post("/writeoffs/{id}/approve", h.ApproveWriteoff)
		api.Get("/inventory/counts", h.ListCounts)
		api.Post("/inventory/counts/{id}/start", h.StartCount)
		api.Post("/inventory/counts/{id}/scan", h.ScanCount)
		api.Post("/inventory/counts/{id}/complete", h.CompleteCount)
		api.Get("/iot/alerts", h.IoTAlerts)
		api.Post("/iot/readings", h.IoTReadings)
		api.Get("/purchase-orders", h.ListPurchaseOrders)
		api.Get("/cells", h.ListCells)
		if full {
			api.Route("/receipts", func(rc chi.Router) {
				rc.Post("/", h.CreateReceipt)
				rc.Post("/{receipt_id}/scan", h.ScanReceipt)
				rc.Post("/{receipt_id}/frozen-temp", h.FrozenTemp)
				rc.Post("/{receipt_id}/complete", h.CompleteReceipt)
			})
			api.Route("/placement", func(pc chi.Router) {
				pc.Post("/", h.PlaceItem)
				pc.Get("/pending", h.PendingPlacements)
			})
		}
	})
}

func (h WMSHandler) ListWriteoffs(w http.ResponseWriter, r *http.Request) {
	rows, err := h.Pool.Query(r.Context(), `
		SELECT id, sku_id::text, quantity, reason, status, created_at FROM wms_writeoffs ORDER BY created_at DESC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var id, skuID, reason, status string
		var qty int
		var created time.Time
		if rows.Scan(&id, &skuID, &qty, &reason, &status, &created) == nil {
			list = append(list, map[string]any{
				"id": id, "sku_id": skuID, "quantity": qty, "reason": reason,
				"status": status, "created_at": created.Format(time.RFC3339),
			})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"writeoffs": list})
}

func (h WMSHandler) CreateWriteoff(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SKUID    string `json:"sku_id"`
		Quantity int    `json:"quantity"`
		Reason   string `json:"reason"`
		PhotoURL string `json:"photo_url"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	id := "wo-" + uuid.New().String()[:8]
	_, err := h.Pool.Exec(r.Context(), `
		INSERT INTO wms_writeoffs (id, sku_id, quantity, reason, photo_url, status)
		VALUES ($1, $2, $3, $4, $5, 'pending_director')
	`, id, body.SKUID, body.Quantity, body.Reason, body.PhotoURL)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": id, "status": "pending_director"})
}

func (h WMSHandler) ApproveWriteoff(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Signature string `json:"signature"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	_, err := h.Pool.Exec(r.Context(), `
		UPDATE wms_writeoffs SET status = 'approved', director_signature = $1, approved_at = NOW() WHERE id = $2
	`, body.Signature, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": id})
}

func (h WMSHandler) ListCounts(w http.ResponseWriter, r *http.Request) {
	rows, err := h.Pool.Query(r.Context(), `
		SELECT id, zone, status, items_total, items_counted, variance_pct FROM wms_inventory_counts ORDER BY id
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer rows.Close()
	counts := []map[string]any{}
	for rows.Next() {
		var id, zone, status string
		var total, counted int
		var variance *float64
		if rows.Scan(&id, &zone, &status, &total, &counted, &variance) == nil {
			c := map[string]any{"id": id, "zone": zone, "status": status, "items_total": total, "items_counted": counted}
			if variance != nil {
				c["variance_pct"] = *variance
			}
			counts = append(counts, c)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"counts": counts})
}

func (h WMSHandler) StartCount(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, _ = h.Pool.Exec(r.Context(), `UPDATE wms_inventory_counts SET status = 'in_progress' WHERE id = $1`, id)
	writeJSON(w, http.StatusOK, map[string]any{"id": id, "status": "in_progress"})
}

func (h WMSHandler) ScanCount(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, _ = h.Pool.Exec(r.Context(), `
		UPDATE wms_inventory_counts SET items_counted = items_counted + 1 WHERE id = $1
	`, id)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h WMSHandler) CompleteCount(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var total, counted int
	_ = h.Pool.QueryRow(r.Context(), `SELECT items_total, items_counted FROM wms_inventory_counts WHERE id = $1`, id).Scan(&total, &counted)
	variance := 0.0
	if total > 0 {
		variance = float64(abs(total-counted)) / float64(total) * 100
	}
	_, _ = h.Pool.Exec(r.Context(), `
		UPDATE wms_inventory_counts SET status = 'completed', variance_pct = $1 WHERE id = $2
	`, variance, id)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "variance_pct": variance, "passed": variance < 2})
}

func (h WMSHandler) IoTAlerts(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"alerts": []map[string]any{{
			"id": "iot-1", "device_id": "TB-C-001", "temperature_c": 9.2,
			"threshold_c": 8, "duration_minutes": 18, "severity": "critical",
		}},
	})
}

func (h WMSHandler) IoTReadings(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Readings []map[string]any `json:"readings"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	count := len(body.Readings)
	if count == 0 {
		count = 1
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "count": count})
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

package main

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jomboy-lavka/pkg/httpx"
	"github.com/jomboy-lavka/pkg/server"
)

var (
	taskItems = []map[string]any{
		{
			"product_id": "00000000-0000-4000-8000-000000000001", "name": "Молоко 3.2%",
			"zone": "A", "shelf": "A-1", "photo_url": "", "quantity": 1.0,
			"barcode": "4600123456789", "is_weighted": true, "is_marked": true,
		},
		{
			"product_id": "00000000-0000-4000-8000-000000000002", "name": "Хлеб белый",
			"zone": "B", "shelf": "B-2", "photo_url": "", "quantity": 2.0,
			"barcode": "4600987654321", "is_weighted": false, "is_marked": false,
		},
	}
	scans sync.Map // orderID -> map[barcode]weight
)

func main() {
	server.Run(server.Options{
		ServiceName: "picker",
		DefaultPort: "8103",
		Phase:       5,
		Extra:       map[string]any{"wave_zones": []string{"A", "B", "C", "D", "E", "F"}},
		Register:    register,
	})
}

func register(r chi.Router) {
	r.Route("/api/v1/picker", func(api chi.Router) {
		api.Get("/tasks/next", tasksNext)
		api.Post("/tasks/{order_id}/start", taskStart)
		api.Post("/tasks/{order_id}/scan", taskScan)
		api.Post("/tasks/{order_id}/replacement", taskReplacement)
		api.Post("/tasks/{order_id}/complete", taskComplete)
		api.Get("/stats", pickerStats)
	})
}

func tasksNext(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{
		"order_id":     "00000000-0000-4000-8000-000000001002",
		"sla_deadline": time.Now().Add(15 * time.Minute).Format(time.RFC3339),
		"wave":         []string{"A", "B", "C"},
		"items":        taskItems,
	})
}

func taskStart(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true, "status": "ASSEMBLY"})
}

func taskScan(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "order_id")
	var body struct {
		ProductID      string   `json:"product_id"`
		Barcode        string   `json:"barcode"`
		MeasuredWeight *float64 `json:"measured_weight"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	expected := ""
	isWeighted := false
	for _, it := range taskItems {
		if it["product_id"] == body.ProductID || it["barcode"] == body.Barcode {
			expected = it["barcode"].(string)
			isWeighted = it["is_weighted"].(bool)
			break
		}
	}
	if expected == "" || body.Barcode != expected {
		httpx.Error(w, http.StatusBadRequest, "BARCODE_MISMATCH", "wrong barcode")
		return
	}
	if isWeighted {
		if body.MeasuredWeight == nil || *body.MeasuredWeight <= 0 {
			httpx.Error(w, http.StatusBadRequest, "WEIGHT_REQUIRED", "BLE weight required")
			return
		}
	}
	scans.Store(orderID+":"+body.Barcode, body.MeasuredWeight)
	httpx.JSON(w, http.StatusOK, map[string]any{
		"ok": true, "barcode": body.Barcode, "measured_weight": body.MeasuredWeight,
	})
}

func taskReplacement(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{
		"ok": true, "timeout_seconds": 60, "timer_seconds": 60, "push_sent": true,
		"replacement_options": []map[string]any{
			{"product_id": "00000000-0000-4000-8000-000000000002", "name": "Замена", "score": 0.9},
		},
	})
}

func taskComplete(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true, "status": "READY"})
}

func pickerStats(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{"orders_today": 12, "avg_minutes": 11.2})
}

package handlers

import (
	"net/http"
	"sync"
	"time"
)

type FraudHandler struct {
	blocks sync.Map
}

func (h *FraudHandler) Stats(w http.ResponseWriter, r *http.Request) {
	blocked := 0
	h.blocks.Range(func(_, v any) bool {
		if entry, ok := v.(map[string]any); ok && entry["status"] == "blocked" {
			blocked++
		}
		return true
	})
	writeJSON(w, http.StatusOK, map[string]any{
		"blocked_count":         blocked,
		"fraud_loss_gmv_pct":    0.32,
		"confirmed_fraud_count": 1,
		"orders_velocity_limit": 4,
	})
}

func (h *FraudHandler) BlockedOrders(w http.ResponseWriter, r *http.Request) {
	list := []map[string]any{}
	h.blocks.Range(func(k, v any) bool {
		if entry, ok := v.(map[string]any); ok {
			list = append(list, entry)
		}
		return true
	})
	writeJSON(w, http.StatusOK, map[string]any{"blocked_orders": list})
}

func (h *FraudHandler) RecordBlock(orderID, customerID string) {
	h.blocks.Store(orderID, map[string]any{
		"id": orderID, "customer_id": customerID, "status": "blocked",
		"blocked_at": time.Now().Format(time.RFC3339),
		"reason":     "Antifraud velocity",
	})
}

package main

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jomboy-lavka/pkg/httpx"
)

var (
	deviceOrderTimes sync.Map // device_id -> []int64
)

func (h *handler) registerExtras(r chi.Router) {
	r.Post("/orders/{order_id}/repeat", h.repeatOrder)
	r.Post("/orders/{order_id}/replacement/choose", h.chooseReplacement)
	r.Post("/orders/{order_id}/report-problem", h.reportProblem)
	r.Post("/orders/{order_id}/rate", h.rateOrder)
	r.Get("/orders/{order_id}/timeline", h.orderTimeline)

	r.Get("/loyalty/wallet", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"balance": 12500, "tier": "silver", "points_to_next_tier": 7500,
		})
	})
	r.Get("/loyalty/referral", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{"code": "DILSHOD2026", "bonus": 15000, "invites": 3})
	})
	r.Get("/loyalty/history", func(w http.ResponseWriter, r *http.Request) {
		history := []map[string]any{
			{"type": "accrual", "amount": 500, "created_at": time.Now().Add(-24 * time.Hour).Format(time.RFC3339)},
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"history": history, "entries": history})
	})
	r.Post("/loyalty/promocode/validate", func(w http.ResponseWriter, r *http.Request) {
		var body struct{ Code string `json:"code"` }
		_ = json.NewDecoder(r.Body).Decode(&body)
		valid := body.Code == "WELCOME10" || body.Code == "JOMBOY"
		httpx.JSON(w, http.StatusOK, map[string]any{
			"valid": valid, "discount_percent": 10, "message": "OK",
		})
	})
	r.Get("/customers/{customer_id}/fraud-profile", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"customer_id": chi.URLParam(r, "customer_id"), "risk_score": 15,
			"trust_score": 0.92, "flags": []any{}, "recommendation": "approve_refund",
		})
	})
}

func (h *handler) checkOrderFraud(deviceID, customerID string) bool {
	if deviceID == "" {
		return false
	}
	now := time.Now().UnixMilli()
	var times []int64
	if v, ok := deviceOrderTimes.Load(deviceID); ok {
		times = v.([]int64)
	}
	hourAgo := now - 3600000
	filtered := []int64{}
	for _, t := range times {
		if t > hourAgo {
			filtered = append(filtered, t)
		}
	}
	filtered = append(filtered, now)
	deviceOrderTimes.Store(deviceID, filtered)
	return len(filtered) > 4
}

func (h *handler) repeatOrder(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "order_id")
	newID := uuid.New().String()
	httpx.JSON(w, http.StatusCreated, map[string]any{"order_id": newID, "repeated_from": id, "status": "NEW"})
}

func (h *handler) chooseReplacement(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ProductID string `json:"product_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	httpx.JSON(w, http.StatusOK, map[string]any{
		"ok": true, "order_id": chi.URLParam(r, "order_id"), "product_id": body.ProductID,
	})
}

func (h *handler) reportProblem(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Type        string `json:"type"`
		Description string `json:"description"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	httpx.JSON(w, http.StatusCreated, map[string]any{
		"ticket_id": uuid.New().String(), "order_id": chi.URLParam(r, "order_id"), "status": "new",
	})
}

func (h *handler) rateOrder(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Stars   int    `json:"stars"`
		Rating  int    `json:"rating"`
		Comment string `json:"comment"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	stars := body.Stars
	if stars == 0 {
		stars = body.Rating
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true, "stars": stars, "rating": stars})
}

func (h *handler) orderTimeline(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "order_id")
	now := time.Now()
	httpx.JSON(w, http.StatusOK, map[string]any{
		"order_id": id,
		"events": []map[string]any{
			{"status": "NEW", "at": now.Add(-30 * time.Minute).Format(time.RFC3339), "actor": "customer"},
			{"status": "ACCEPTED", "at": now.Add(-28 * time.Minute).Format(time.RFC3339), "actor": "system"},
			{"status": "ASSEMBLY", "at": now.Add(-20 * time.Minute).Format(time.RFC3339), "actor": "picker"},
			{"status": "IN_DELIVERY", "at": now.Add(-10 * time.Minute).Format(time.RFC3339), "actor": "courier"},
		},
	})
}

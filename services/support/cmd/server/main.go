package main

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	"github.com/jomboy-lavka/pkg/httpx"
	"github.com/jomboy-lavka/pkg/server"
)

var (
	tickets  = sync.Map{}
	upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
)

func main() {
	seedTickets()
	server.Run(server.Options{
		ServiceName: "support",
		DefaultPort: "8106",
		Phase:       5,
		Extra:       map[string]any{"sla": true, "websocket_chat": true},
		Register:    register,
	})
}

func seedTickets() {
	// Align with mock seed ticket IDs (uuid(2001))
	tickets.Store("00000000-0000-4000-8000-000000002001", map[string]any{
		"id": "00000000-0000-4000-8000-000000002001", "status": "new", "priority": "high",
		"order_id":     "00000000-0000-4000-8000-000000001001",
		"description":  "Привезли не тот товар",
		"sla_deadline": time.Now().Add(2 * time.Hour).Format(time.RFC3339),
	})
	tickets.Store("00000000-0000-4000-8000-000000002002", map[string]any{
		"id": "00000000-0000-4000-8000-000000002002", "status": "in_progress", "priority": "critical",
		"order_id":     "00000000-0000-4000-8000-000000001002",
		"description":  "Заказ не доставлен",
		"sla_deadline": time.Now().Add(1 * time.Hour).Format(time.RFC3339),
	})
}

func register(r chi.Router) {
	r.Route("/api/v1/tickets", func(api chi.Router) {
		api.Get("/", listTickets)
		api.Get("/enriched", listEnrichedTickets)
		api.Get("/{ticket_id}", getTicket)
		api.Post("/{ticket_id}/refund-decision", refundDecision)
		api.Get("/{ticket_id}/auto-refund-eligibility", autoRefundEligibility)
	})
	r.Route("/api/v1/support", func(api chi.Router) {
		api.Post("/ai/suggest", aiSuggest)
		api.Post("/ai/auto-reply", aiAutoReply)
	})
	r.Get("/api/v1/support/ws", wsHandler)
	r.Get("/api/v1/ws", wsHandler)
}

func listTickets(w http.ResponseWriter, r *http.Request) {
	list := []map[string]any{}
	tickets.Range(func(k, v any) bool {
		list = append(list, v.(map[string]any))
		return true
	})
	httpx.JSON(w, http.StatusOK, map[string]any{"tickets": list})
}

func listEnrichedTickets(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	list := []map[string]any{}
	tickets.Range(func(k, v any) bool {
		t := v.(map[string]any)
		if status != "" && t["status"] != status {
			return true
		}
		enriched := map[string]any{}
		for key, val := range t {
			enriched[key] = val
		}
		enriched["customer_name"] = "Dilshod K."
		enriched["order_total"] = 85000
		enriched["sla_remaining_min"] = 45
		list = append(list, enriched)
		return true
	})
	httpx.JSON(w, http.StatusOK, map[string]any{"tickets": list})
}

func aiSuggest(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Question    string `json:"question"`
		Description string `json:"description"`
		TicketType  string `json:"ticket_type"`
		Lang        string `json:"lang"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	_ = body.Question
	if body.Question == "" {
		_ = body.Description
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"suggestions": []map[string]any{
			{"text": "Предлагаем полный возврат за неверный товар", "confidence": 0.92, "action": "refund_full"},
			{"text": "Замена товара при следующем заказе", "confidence": 0.78, "action": "replacement"},
		},
	})
}

func aiAutoReply(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{
		"reply": "Здравствуйте! Приносим извинения за доставленный товар. Мы оформим возврат в течение 24 часов.",
		"auto_sent": false, "confidence": 0.88,
	})
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	channel := r.URL.Query().Get("channel")
	if channel == "" {
		channel = "support"
	}
	_ = conn.WriteJSON(map[string]any{"type": "connected", "channel": channel, "ts": time.Now().Format(time.RFC3339)})
	if channel == "orders" {
		go streamCourierLocation(conn)
	}
	for {
		var msg map[string]any
		if err := conn.ReadJSON(&msg); err != nil {
			break
		}
		if msg["type"] == "chat_message" {
			_ = conn.WriteJSON(map[string]any{
				"type": "chat_message", "from": "operator",
				"text": "Здравствуйте! Чем могу помочь?",
				"ts":   time.Now().UnixMilli(),
			})
			continue
		}
		msg["type"] = "message"
		msg["ts"] = time.Now().Format(time.RFC3339)
		_ = conn.WriteJSON(msg)
	}
}

func streamCourierLocation(conn *websocket.Conn) {
	lat, lng := 41.3111, 69.2797
	for i := 0; i < 5; i++ {
		time.Sleep(2 * time.Second)
		lat += 0.001
		lng += 0.001
		_ = conn.WriteJSON(map[string]any{
			"type": "courier_location", "lat": lat, "lng": lng,
			"eta_minutes": 12 - i*2, "ts": time.Now().Format(time.RFC3339),
		})
	}
}

func getTicket(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "ticket_id")
	if v, ok := tickets.Load(id); ok {
		httpx.JSON(w, http.StatusOK, v)
		return
	}
	httpx.Error(w, http.StatusNotFound, "NOT_FOUND", id)
}

func autoRefundEligibility(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "ticket_id")
	httpx.JSON(w, http.StatusOK, map[string]any{
		"ticket_id": id, "eligible": true, "max_amount": 85000, "reason": "wrong_item",
	})
}

func refundDecision(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "ticket_id")
	var body struct {
		Decision string `json:"decision"`
		Amount   int    `json:"amount"`
		Auto     bool   `json:"auto"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if v, ok := tickets.Load(id); ok {
		t := v.(map[string]any)
		t["status"] = body.Decision
		tickets.Store(id, t)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true, "decision": body.Decision, "amount": body.Amount})
}

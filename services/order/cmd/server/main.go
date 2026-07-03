package main

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jomboy-lavka/pkg/config"
	"github.com/jomboy-lavka/pkg/fsm"
	"github.com/jomboy-lavka/pkg/httpx"
	"github.com/jomboy-lavka/pkg/natsx"
	"github.com/jomboy-lavka/pkg/server"
)

func connectPool(ctx context.Context, url string) *pgxpool.Pool {
	if url == "" {
		return nil
	}
	p, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil
	}
	if err := p.Ping(ctx); err != nil {
		p.Close()
		return nil
	}
	return p
}

func main() {
	cfg := config.Load("order", "8102")
	var pool *pgxpool.Pool
	if cfg.DatabaseURL != "" {
		pool = connectPool(context.Background(), cfg.DatabaseURL)
		if pool != nil {
			defer pool.Close()
		}
	}
	var nc *natsx.Client
	if c, err := natsx.Connect(cfg.NatsURL); err == nil {
		nc = c
		defer nc.Close()
	}

	h := &handler{pool: pool, nats: nc, idem: sync.Map{}}

	server.Run(server.Options{
		ServiceName: "order",
		DefaultPort: "8102",
		Phase:       5,
		Extra: map[string]any{"fsm": true, "nats": nc != nil, "db": pool != nil},
		Register:    h.register,
	})
}

type handler struct {
	pool *pgxpool.Pool
	nats *natsx.Client
	idem sync.Map
}

func (h *handler) register(r chi.Router) {
	r.Route("/api/v1", func(api chi.Router) {
		api.Post("/delivery/quote", h.deliveryQuote)
		api.Get("/orders", h.listOrders)
		api.Post("/orders", h.createOrder)
		api.Get("/orders/{order_id}", h.getOrder)
		api.Post("/orders/{order_id}/cancel", h.cancelOrder)
		api.Post("/orders/{order_id}/transition", h.transitionOrder)
		api.Get("/orders/{order_id}/payment", h.getPayment)
		api.Get("/orders/{order_id}/replacement", h.getReplacement)
		h.registerExtras(api)
	})
}

func (h *handler) deliveryQuote(w http.ResponseWriter, r *http.Request) {
	var body struct {
		DarkstoreID     string  `json:"darkstore_id"`
		Subtotal        int     `json:"subtotal"`
		CartTotal       int     `json:"cart_total"`
		DistanceKm      float64 `json:"distance_km"`
		IsComplex       bool    `json:"is_complex"`
		ComplexMahalla  bool    `json:"complex_mahalla"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.CartTotal == 0 {
		body.CartTotal = body.Subtotal
	}
	fee := 15000
	if body.CartTotal >= 150000 {
		fee = 0
	}
	if body.IsComplex || body.ComplexMahalla {
		fee += 3000
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"delivery_fee": fee,
		"eta_minutes":  18,
		"darkstore_id": body.DarkstoreID,
	})
}

func (h *handler) listOrders(w http.ResponseWriter, r *http.Request) {
	if h.pool == nil {
		httpx.JSON(w, http.StatusOK, map[string]any{"orders": []any{}})
		return
	}
	rows, err := h.pool.Query(r.Context(), `SELECT id, status, total_amount FROM orders ORDER BY created_at DESC LIMIT 50`)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer rows.Close()
	orders := []map[string]any{}
	for rows.Next() {
		var id, status string
		var total int
		if rows.Scan(&id, &status, &total) == nil {
			orders = append(orders, map[string]any{"id": id, "status": status, "total_amount": total})
		}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"orders": orders})
}

func (h *handler) createOrder(w http.ResponseWriter, r *http.Request) {
	idemKey := r.Header.Get("X-Idempotency-Key")
	if idemKey != "" {
		if v, ok := h.idem.Load(idemKey); ok {
			httpx.JSON(w, http.StatusOK, v)
			return
		}
	}
	var body struct {
		DarkstoreID     string `json:"darkstore_id"`
		CustomerID      string `json:"customer_id"`
		DeviceID        string `json:"device_id"`
		PaymentMethod   string `json:"payment_method"`
		DeliveryAddress any    `json:"delivery_address"`
		Items           []struct {
			ProductID string `json:"product_id"`
			Quantity  int    `json:"quantity"`
		} `json:"items"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "BAD_REQUEST", "invalid json")
		return
	}
	if body.CustomerID == "" {
		body.CustomerID = "cust-dilshod"
	}
	if h.checkOrderFraud(body.DeviceID, body.CustomerID) {
		httpx.JSON(w, http.StatusForbidden, map[string]any{
			"code": "FRAUD_BLOCKED", "message": "Заказ заблокирован антифродом",
			"fraud_profile": map[string]any{"risk_score": 85, "flags": []map[string]string{{"code": "ORDERS_VELOCITY"}}},
		})
		return
	}
	orderID := uuid.New().String()
	subtotal := 0
	for _, it := range body.Items {
		var price int
		if h.pool != nil {
			_ = h.pool.QueryRow(r.Context(), `SELECT price FROM products WHERE id = $1`, it.ProductID).Scan(&price)
		}
		subtotal += price * it.Quantity
	}
	deliveryFee := 15000
	if subtotal >= 150000 {
		deliveryFee = 0
	}
	total := subtotal + deliveryFee
	addr, _ := json.Marshal(body.DeliveryAddress)

	if h.pool != nil {
		_, err := h.pool.Exec(r.Context(), `
			INSERT INTO orders (id, status, darkstore_id, customer_id, subtotal, delivery_fee, total_amount, delivery_address, payment_method)
			VALUES ($1, 'NEW', $2, $3, $4, $5, $6, $7, $8)
		`, orderID, body.DarkstoreID, body.CustomerID, subtotal, deliveryFee, total, addr, body.PaymentMethod)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
	}
	resp := map[string]any{"order_id": orderID, "status": "NEW", "total_amount": total, "subtotal": subtotal, "delivery_fee": deliveryFee}
	if idemKey != "" {
		h.idem.Store(idemKey, resp)
	}
	if h.nats != nil {
		_ = h.nats.Publish(r.Context(), natsx.SubjectOrderCreated, map[string]any{"order_id": orderID, "status": "NEW"})
	}
	httpx.JSON(w, http.StatusCreated, resp)
}

func (h *handler) getOrder(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "order_id")
	if h.pool == nil {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", id)
		return
	}
	var status string
	var total int
	err := h.pool.QueryRow(r.Context(), `SELECT status, total_amount FROM orders WHERE id = $1`, id).Scan(&status, &total)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", id)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"id": id, "status": status, "total_amount": total,
		"allowed_transitions": fsm.AllowedTransitions(status),
	})
}

func (h *handler) cancelOrder(w http.ResponseWriter, r *http.Request) {
	h.doTransition(w, r, "CANCELLED_BY_USER")
}

func (h *handler) transitionOrder(w http.ResponseWriter, r *http.Request) {
	var body struct {
		To string `json:"to"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.To == "" {
		httpx.Error(w, http.StatusBadRequest, "BAD_REQUEST", "to required")
		return
	}
	h.doTransition(w, r, body.To)
}

func (h *handler) doTransition(w http.ResponseWriter, r *http.Request, to string) {
	id := chi.URLParam(r, "order_id")
	if h.pool == nil {
		httpx.Error(w, http.StatusServiceUnavailable, "DB_UNAVAILABLE", "no db")
		return
	}
	var from string
	if err := h.pool.QueryRow(r.Context(), `SELECT status FROM orders WHERE id = $1`, id).Scan(&from); err != nil {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", id)
		return
	}
	if !fsm.CanTransition(from, to) {
		httpx.Error(w, http.StatusConflict, "INVALID_TRANSITION", from+" -> "+to)
		return
	}
	_, err := h.pool.Exec(r.Context(), `UPDATE orders SET status = $1 WHERE id = $2`, to, id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if h.nats != nil {
		_ = h.nats.Publish(r.Context(), natsx.SubjectOrderStatusChanged, map[string]any{
			"order_id": id, "from": from, "to": to,
		})
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"order_id": id, "status": to, "from": from})
}

func (h *handler) getPayment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "order_id")
	httpx.JSON(w, http.StatusOK, map[string]any{
		"order_id": id, "status": "paid", "provider": "payme", "amount": 85000,
		"fiscal_receipt": map[string]string{"soliq_ref": "OFD-" + id[:8]},
	})
}

func (h *handler) getReplacement(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "order_id")
	httpx.JSON(w, http.StatusOK, map[string]any{
		"order_id": id, "pending": true, "timeout_seconds": 60,
		"options": []map[string]any{{"product_id": "00000000-0000-4000-8000-000000000002", "name": "Замена"}},
	})
}

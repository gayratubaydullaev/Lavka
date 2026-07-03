package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/jomboy-lavka/pkg/config"
	"github.com/jomboy-lavka/pkg/httpx"
	"github.com/jomboy-lavka/pkg/natsx"
	"github.com/jomboy-lavka/pkg/server"
)

func main() {
	cfg := config.Load("billing", "8105")
	var nc *natsx.Client
	if c, err := natsx.Connect(cfg.NatsURL); err == nil {
		nc = c
		defer nc.Close()
	}
	h := &handler{
		nats: nc, idem: sync.Map{}, fiscal: sync.Map{},
		orders: sync.Map{}, processed: sync.Map{},
	}
	// Seed known demo orders (mock parity)
	h.seedOrder("00000000-0000-4000-8000-000000001001", 85000)
	h.seedOrder("00000000-0000-4000-8000-000000001002", 92000)
	h.seedOrder("00000000-0000-4000-8000-000000001003", 110000)

	server.Run(server.Options{
		ServiceName: "billing",
		DefaultPort: "8105",
		Phase:       5,
		Extra:       map[string]any{"payme": true, "click": true, "fiscal": true},
		Register:    h.register,
	})
}

type orderPay struct {
	ID            string `json:"id"`
	TotalAmount   int    `json:"total_amount"`
	Status        string `json:"status"`
	PaymentStatus string `json:"payment_status"`
}

type handler struct {
	nats      *natsx.Client
	idem      sync.Map
	fiscal    sync.Map
	orders    sync.Map
	processed sync.Map
}

func (h *handler) seedOrder(id string, total int) {
	h.orders.Store(id, &orderPay{ID: id, TotalAmount: total, Status: "NEW", PaymentStatus: "pending"})
}

func (h *handler) register(r chi.Router) {
	r.Route("/api/v1/payments", func(api chi.Router) {
		api.Post("/initiate", h.initiate)
		api.Post("/webhooks/payme", h.webhookPayme)
		api.Post("/webhooks/click", h.webhookClick)
		api.Get("/fiscal/{order_id}", h.fiscalGet)
		api.Post("/fiscal/{order_id}/issue", h.fiscalIssue)
	})
	r.Post("/api/v1/refunds", h.refund)
}

func (h *handler) getOrder(orderID string) *orderPay {
	if v, ok := h.orders.Load(orderID); ok {
		return v.(*orderPay)
	}
	return nil
}

func (h *handler) initiate(w http.ResponseWriter, r *http.Request) {
	var body struct {
		OrderID    string `json:"order_id"`
		Amount     int    `json:"amount"`
		Provider   string `json:"provider"`
		FailoverTo string `json:"failover_provider"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.Provider == "" {
		body.Provider = "payme"
	}
	if o := h.getOrder(body.OrderID); o != nil && body.Amount > 0 {
		o.TotalAmount = body.Amount
	} else if body.OrderID != "" && body.Amount > 0 {
		h.seedOrder(body.OrderID, body.Amount)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"payment_id":   "pay-" + body.OrderID,
		"provider":     body.Provider,
		"redirect_url": "https://checkout.payme.uz/mock/" + body.OrderID,
		"failover":     body.FailoverTo,
	})
}

func (h *handler) webhookPayme(w http.ResponseWriter, r *http.Request) {
	var body map[string]any
	_ = json.NewDecoder(r.Body).Decode(&body)
	txID := extractString(body, "transaction_id")
	if params, ok := body["params"].(map[string]any); ok {
		if txID == "" {
			txID = extractString(params, "id")
		}
	}
	if txID == "" {
		httpx.Error(w, http.StatusBadRequest, "MISSING_TX", "missing transaction id")
		return
	}
	if _, ok := h.processed.Load(txID); ok {
		httpx.JSON(w, http.StatusOK, map[string]any{"result": map[string]int{"state": 2}, "idempotent": true})
		return
	}
	orderID := extractString(body, "order_id")
	if params, ok := body["params"].(map[string]any); ok {
		if acct, ok := params["account"].(map[string]any); ok && orderID == "" {
			orderID = extractString(acct, "order_id")
		}
	}
	order := h.getOrder(orderID)
	if order == nil {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	amountTiyin := extractInt(body, "amount")
	if params, ok := body["params"].(map[string]any); ok && amountTiyin == 0 {
		amountTiyin = extractInt(params, "amount")
	}
	if amountTiyin > 0 && order.TotalAmount*100 != amountTiyin {
		httpx.Error(w, http.StatusBadRequest, "AMOUNT_MISMATCH", "amount mismatch")
		return
	}
	h.markPaid(order, txID, "payme")
	httpx.JSON(w, http.StatusOK, map[string]any{
		"result": map[string]int{"state": 2},
		"receipt_id": h.fiscalID(order.ID),
	})
}

func (h *handler) webhookClick(w http.ResponseWriter, r *http.Request) {
	var body map[string]any
	_ = json.NewDecoder(r.Body).Decode(&body)
	txID := extractString(body, "click_trans_id")
	if txID == "" {
		txID = extractString(body, "transaction_id")
	}
	if txID == "" {
		httpx.JSON(w, http.StatusBadRequest, map[string]any{"error": -8, "error_note": "missing tx"})
		return
	}
	if _, ok := h.processed.Load(txID); ok {
		httpx.JSON(w, http.StatusOK, map[string]any{"error": 0, "error_note": "Success", "idempotent": true})
		return
	}
	orderID := extractString(body, "merchant_trans_id")
	if orderID == "" {
		orderID = extractString(body, "order_id")
	}
	order := h.getOrder(orderID)
	if order == nil {
		httpx.JSON(w, http.StatusOK, map[string]any{"error": -5, "error_note": "Order not found"})
		return
	}
	h.markPaid(order, txID, "click")
	httpx.JSON(w, http.StatusOK, map[string]any{"error": 0, "error_note": "Success", "receipt_id": h.fiscalID(order.ID)})
}

func (h *handler) markPaid(order *orderPay, txID, provider string) {
	h.processed.Store(txID, true)
	order.PaymentStatus = "paid"
	if order.Status == "NEW" {
		order.Status = "ACCEPTED"
	}
	h.issueFiscal(order)
	if h.nats != nil {
		_ = h.nats.Publish(context.Background(), natsx.SubjectPaymentCaptured, map[string]any{
			"order_id": order.ID, "provider": provider,
		})
	}
}

func (h *handler) issueFiscal(order *orderPay) {
	hash := sha256.Sum256([]byte(order.ID + ":" + itoa(order.TotalAmount)))
	rec := map[string]any{
		"order_id": order.ID, "issued": true, "amount": order.TotalAmount,
		"fiscal_sign": hex.EncodeToString(hash[:8]),
		"soliq_ref":   "SOLIQ-" + order.ID[:8],
		"ofd_status":  "sent",
	}
	h.fiscal.Store(order.ID, rec)
}

func (h *handler) fiscalID(orderID string) string {
	if v, ok := h.fiscal.Load(orderID); ok {
		if m, ok := v.(map[string]any); ok {
			if s, ok := m["soliq_ref"].(string); ok {
				return s
			}
		}
	}
	return ""
}

func (h *handler) fiscalGet(w http.ResponseWriter, r *http.Request) {
	oid := chi.URLParam(r, "order_id")
	if v, ok := h.fiscal.Load(oid); ok {
		httpx.JSON(w, http.StatusOK, v)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"order_id": oid, "issued": false})
}

func (h *handler) fiscalIssue(w http.ResponseWriter, r *http.Request) {
	oid := chi.URLParam(r, "order_id")
	order := h.getOrder(oid)
	if order == nil {
		order = &orderPay{ID: oid, TotalAmount: 85000}
	}
	h.issueFiscal(order)
	if v, ok := h.fiscal.Load(oid); ok {
		httpx.JSON(w, http.StatusOK, v)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"order_id": oid, "issued": true})
}

func (h *handler) refund(w http.ResponseWriter, r *http.Request) {
	var body struct {
		OrderID string `json:"order_id"`
		Amount  int    `json:"amount"`
		Reason  string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	httpx.JSON(w, http.StatusOK, map[string]any{
		"refund_id": "ref-" + body.OrderID,
		"status":    "completed",
		"amount":    body.Amount,
	})
}

func extractString(m map[string]any, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	if v, ok := m[key].(float64); ok {
		return itoa(int(v))
	}
	return ""
}

func extractInt(m map[string]any, key string) int {
	switch v := m[key].(type) {
	case float64:
		return int(v)
	case int:
		return v
	case json.Number:
		n, _ := v.Int64()
		return int(n)
	}
	return 0
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	buf := []byte{}
	for n > 0 {
		buf = append([]byte{byte('0' + n%10)}, buf...)
		n /= 10
	}
	if neg {
		buf = append([]byte{'-'}, buf...)
	}
	return string(buf)
}

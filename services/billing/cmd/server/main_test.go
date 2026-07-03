package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPaymeAmountMismatch(t *testing.T) {
	h := &handler{}
	h.seedOrder("ord-1", 85000)
	body, _ := json.Marshal(map[string]any{
		"transaction_id": "tx-fail",
		"order_id":       "ord-1",
		"amount":         1,
		"params":         map[string]any{"id": "tx-fail", "amount": 1, "account": map[string]string{"order_id": "ord-1"}},
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/webhooks/payme", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.webhookPayme(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestClickIdempotent(t *testing.T) {
	h := &handler{}
	h.seedOrder("00000000-0000-4000-8000-000000001001", 85000)
	body, _ := json.Marshal(map[string]any{
		"click_trans_id": "click-1", "merchant_trans_id": "00000000-0000-4000-8000-000000001001",
	})
	req1 := httptest.NewRequest(http.MethodPost, "/api/v1/payments/webhooks/click", bytes.NewReader(body))
	w1 := httptest.NewRecorder()
	h.webhookClick(w1, req1)
	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/payments/webhooks/click", bytes.NewReader(body))
	w2 := httptest.NewRecorder()
	h.webhookClick(w2, req2)
	var r2 map[string]any
	_ = json.Unmarshal(w2.Body.Bytes(), &r2)
	if r2["idempotent"] != true && r2["error"] != float64(0) {
		t.Fatalf("expected idempotent click, got %v", r2)
	}
}

func TestRefundCompleted(t *testing.T) {
	h := &handler{}
	body, _ := json.Marshal(map[string]any{"order_id": "o1", "amount": 1000})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/refunds", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.refund(w, req)
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["status"] != "completed" {
		t.Fatalf("status %v", resp["status"])
	}
}

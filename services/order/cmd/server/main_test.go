package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestDeliveryQuoteComplexMahalla(t *testing.T) {
	h := &handler{}
	body, _ := json.Marshal(map[string]any{
		"darkstore_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		"subtotal":     50000,
		"is_complex":   true,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/delivery/quote", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.deliveryQuote(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status %d", w.Code)
	}
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	fee, _ := resp["delivery_fee"].(float64)
	if int(fee) < 18000 {
		t.Fatalf("expected fee >= 18000, got %v", fee)
	}
}

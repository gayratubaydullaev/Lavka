package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestCheckOrderFraudVelocity(t *testing.T) {
	h := &handler{}
	deviceID := "dev-test-velocity"
	for i := 0; i < 4; i++ {
		if h.checkOrderFraud(deviceID, "cust-1") {
			t.Fatalf("expected no block on order %d", i+1)
		}
	}
	if !h.checkOrderFraud(deviceID, "cust-1") {
		t.Fatal("expected fraud block on 5th order within hour")
	}
}

func TestRepeatOrderRoute(t *testing.T) {
	h := &handler{}
	r := chi.NewRouter()
	h.registerExtras(r)

	req := httptest.NewRequest(http.MethodPost, "/orders/abc/repeat", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status %d", rec.Code)
	}
	var body map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if body["repeated_from"] != "abc" {
		t.Fatalf("unexpected body: %v", body)
	}
}

func TestLoyaltyWallet(t *testing.T) {
	h := &handler{}
	r := chi.NewRouter()
	h.registerExtras(r)

	req := httptest.NewRequest(http.MethodGet, "/loyalty/wallet", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d", rec.Code)
	}
}

func TestCreateOrderFraudBlocked(t *testing.T) {
	h := &handler{}
	deviceID := "dev-block-test"
	for i := 0; i < 5; i++ {
		h.checkOrderFraud(deviceID, "cust-x")
	}

	r := chi.NewRouter()
	r.Post("/orders", h.createOrder)
	payload, _ := json.Marshal(map[string]any{
		"darkstore_id": "ds1", "device_id": deviceID,
		"items": []map[string]any{{"product_id": "p1", "quantity": 1}},
	})
	req := httptest.NewRequest(http.MethodPost, "/orders", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", rec.Code, rec.Body.String())
	}
}

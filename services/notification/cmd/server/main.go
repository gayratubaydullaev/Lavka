package main

import (
	"encoding/json"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jomboy-lavka/pkg/httpx"
	"github.com/jomboy-lavka/pkg/server"
)

var (
	pushOutbox sync.Map
	devices    sync.Map
)

func main() {
	server.Run(server.Options{
		ServiceName: "notification",
		DefaultPort: "8107",
		Phase:       5,
		Extra:       map[string]any{"fcm": true, "sms": "eskiz"},
		Register:    register,
	})
}

func register(r chi.Router) {
	r.Post("/api/v1/auth/otp/send", sendOTP)
	r.Post("/api/v1/auth/otp/verify", verifyOTP)
	r.Post("/api/v1/push/register", pushRegister)
	r.Get("/api/v1/push/inbox", pushInbox)
	r.Post("/api/v1/push/send", pushSend)
}

func sendOTP(w http.ResponseWriter, r *http.Request) {
	var body struct{ Phone string `json:"phone"` }
	_ = json.NewDecoder(r.Body).Decode(&body)
	// Eskiz sandbox: log only in dev
	if os.Getenv("ESKIZ_API_TOKEN") != "" {
		// prod: POST https://notify.eskiz.uz/api/message/sms/send
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"session_id": "otp-" + body.Phone, "expires_in": 300, "sms_provider": "eskiz",
	})
}

func verifyOTP(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SessionID string `json:"session_id"`
		Code      string `json:"code"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.Code != "1234" && body.Code != "0000" {
		httpx.Error(w, http.StatusUnauthorized, "INVALID_OTP", "invalid code")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"access_token": "kc-otp-token", "token_type": "Bearer", "expires_in": 3600,
	})
}

func pushRegister(w http.ResponseWriter, r *http.Request) {
	var body struct {
		DeviceID string `json:"device_id"`
		UserID   string `json:"user_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	token := "fcm-" + body.DeviceID
	devices.Store(body.DeviceID, token)
	httpx.JSON(w, http.StatusOK, map[string]any{"token": token, "ok": true})
}

func pushInbox(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		userID = "cust-dilshod"
	}
	msgs := []map[string]any{}
	pushOutbox.Range(func(k, v any) bool {
		m := v.(map[string]any)
		if m["user_id"] == userID {
			msgs = append(msgs, m)
		}
		return true
	})
	httpx.JSON(w, http.StatusOK, map[string]any{"messages": msgs})
}

func pushSend(w http.ResponseWriter, r *http.Request) {
	var body struct {
		UserID  string         `json:"user_id"`
		Title   string         `json:"title"`
		Body    string         `json:"body"`
		Payload map[string]any `json:"payload"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.UserID == "" {
		body.UserID = "cust-dilshod"
	}
	id := time.Now().UnixNano()
	msg := map[string]any{
		"id": id, "user_id": body.UserID, "title": body.Title, "body": body.Body,
		"payload": body.Payload, "sent_at": time.Now().Format(time.RFC3339), "channel": "fcm_stub",
	}
	pushOutbox.Store(id, msg)
	httpx.JSON(w, http.StatusCreated, map[string]any{"ok": true, "message_id": id})
}

func EnqueuePush(userID, title, body string, payload map[string]any) {
	id := time.Now().UnixNano()
	pushOutbox.Store(id, map[string]any{
		"id": id, "user_id": userID, "title": title, "body": body,
		"payload": payload, "sent_at": time.Now().Format(time.RFC3339),
	})
}

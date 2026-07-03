package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jomboy-lavka/pkg/httpx"
	"github.com/jomboy-lavka/pkg/server"
)

var activeOrders sync.Map

func main() {
	server.Run(server.Options{
		ServiceName: "courier",
		DefaultPort: "8104",
		Phase:       5,
		Extra:       map[string]any{"mult_order_max": 2, "postgis": true, "minio": os.Getenv("MINIO_ENDPOINT") != ""},
		Register:    register,
	})
}

func register(r chi.Router) {
	r.Route("/api/v1/courier", func(api chi.Router) {
		api.Post("/shift", shift)
		api.Get("/offers", offers)
		api.Post("/offers/{order_id}/accept", acceptOffer)
		api.Post("/offers/{order_id}/skip", skipOffer)
		api.Post("/orders/{order_id}/status/pickup", pickup)
		api.Post("/orders/{order_id}/status/arrived", arrived)
		api.Post("/location", location)
		api.Post("/orders/{order_id}/problem", problem)
		api.Get("/orders/active", active)
		api.Post("/orders/{order_id}/status/delivered", delivered)
		api.Post("/iot/temperature", iotTemp)
		api.Get("/stats", stats)
		api.Get("/demand-heatmap", heatmap)
		api.Post("/uploads", uploadPhoto)
	})
}

func shift(w http.ResponseWriter, r *http.Request) {
	var body struct{ Action string `json:"action"` }
	_ = json.NewDecoder(r.Body).Decode(&body)
	httpx.JSON(w, http.StatusOK, map[string]any{"online": body.Action == "start"})
}

func offers(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{
		"offers": []map[string]any{{
			"order_id": "00000000-0000-4000-8000-000000001003",
			"address_masked": "Чиланзар, ***", "amount": 110000, "earnings": 11000,
			"distance_km": 1.8, "weight_kg": 3.5,
			"expires_at": time.Now().Add(30 * time.Second).Format(time.RFC3339),
		}},
	})
}

func acceptOffer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "order_id")
	activeOrders.Store(id, map[string]any{"id": id, "status": "IN_DELIVERY"})
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func skipOffer(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{"skipped": true})
}

func pickup(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{"status": "PICKUP"})
}

func arrived(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{"status": "ARRIVED"})
}

func location(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func problem(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{"ticket_id": "t-problem"})
}

func active(w http.ResponseWriter, r *http.Request) {
	list := []map[string]any{}
	activeOrders.Range(func(k, v any) bool {
		list = append(list, v.(map[string]any))
		return true
	})
	httpx.JSON(w, http.StatusOK, map[string]any{"orders": list, "mult_order": true, "max": 2})
}

func delivered(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "order_id")
	var body struct {
		PhotoURL         string `json:"photo_url"`
		Otp              string `json:"otp"`
		ConfirmationCode string `json:"confirmation_code"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.Otp == "" {
		body.Otp = body.ConfirmationCode
	}
	if body.PhotoURL == "" {
		httpx.Error(w, http.StatusBadRequest, "PHOTO_REQUIRED", "delivery photo required")
		return
	}
	activeOrders.Delete(id)
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true, "status": "DELIVERED", "photo": true})
}

func iotTemp(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func stats(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{
		"earnings_today": 85000, "earnings_week": 420000, "earnings_month": 1650000,
		"deliveries_count": 47, "rating": 4.92,
	})
}

func heatmap(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{
		"zones": []map[string]any{
			{"zone_id": "z1", "lat": 41.31, "lng": 69.28, "demand_score": 0.92, "orders_pending": 8},
		},
		"updated_at": time.Now().Format(time.RFC3339),
	})
}

func uploadPhoto(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		httpx.Error(w, http.StatusBadRequest, "BAD_REQUEST", "multipart required")
		return
	}
	file, header, err := r.FormFile("photo")
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "NO_FILE", "photo field required")
		return
	}
	defer file.Close()
	data, _ := io.ReadAll(file)
	objectKey := "delivery/" + uuid.New().String() + ".jpg"
	photoURL, err := putMinIO(objectKey, data, header.Header.Get("Content-Type"))
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "UPLOAD_FAILED", err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"photo_url": photoURL, "ok": true})
}

func putMinIO(objectKey string, data []byte, contentType string) (string, error) {
	endpoint := os.Getenv("MINIO_ENDPOINT")
	if endpoint == "" {
		endpoint = "http://localhost:9000"
	}
	user := os.Getenv("MINIO_ROOT_USER")
	if user == "" {
		user = "jomboy"
	}
	pass := os.Getenv("MINIO_ROOT_PASSWORD")
	if pass == "" {
		pass = "jomboysecret"
	}
	publicURL := os.Getenv("MINIO_PUBLIC_URL")
	if publicURL == "" {
		publicURL = endpoint
	}
	if contentType == "" {
		contentType = "image/jpeg"
	}
	url := endpoint + "/jomboy/" + objectKey
	req, err := http.NewRequest(http.MethodPut, url, bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(user, pass)
	req.Header.Set("Content-Type", contentType)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		// fallback URL for dev without MinIO
		return publicURL + "/jomboy/" + objectKey, nil
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		return publicURL + "/jomboy/" + objectKey, nil
	}
	return publicURL + "/jomboy/" + objectKey, nil
}

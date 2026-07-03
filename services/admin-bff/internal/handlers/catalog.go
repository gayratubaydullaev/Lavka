package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuthHandler struct{}

func (h AuthHandler) SendOTP(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Phone string `json:"phone"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"session_id": "go-session-1",
		"expires_in": 300,
		"phone":      body.Phone,
	})
}

func (h AuthHandler) VerifyOTP(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SessionID string `json:"session_id"`
		Code      string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON")
		return
	}
	if body.Code != "1234" {
		writeError(w, http.StatusUnauthorized, "INVALID_OTP", "Invalid OTP code")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"access_token": "go-jwt-cust-dilshod",
		"token_type":   "Bearer",
		"expires_in":   86400,
		"user_id":      "cust-dilshod",
	})
}

type CatalogHandler struct {
	Pool *pgxpool.Pool
}

func (h CatalogHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	darkstoreID := chi.URLParam(r, "darkstore_id")
	page := queryInt(r, "page", 1)
	limit := queryInt(r, "limit", 20)
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	rows, err := h.Pool.Query(r.Context(), `
		SELECT id, darkstore_id, name, price, weight_g, is_halal, images, stock, zone, category, brand, barcode, active
		FROM products
		WHERE darkstore_id = $1 AND active = true
		ORDER BY id
		LIMIT $2 OFFSET $3
	`, darkstoreID, limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer rows.Close()

	var products []map[string]any
	for rows.Next() {
		var id, dsID, zone, brand, barcode string
		var category *string
		var price, weightG, stock int
		var isHalal, active bool
		var name, images []byte
		if err := rows.Scan(&id, &dsID, &name, &price, &weightG, &isHalal, &images, &stock, &zone, &category, &brand, &barcode, &active); err != nil {
			writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		var nameObj, imagesArr any
		_ = json.Unmarshal(name, &nameObj)
		_ = json.Unmarshal(images, &imagesArr)
		p := map[string]any{
			"id": id, "darkstore_id": dsID, "name": nameObj, "price": price,
			"weight_g": weightG, "is_halal": isHalal, "images": imagesArr,
			"stock": stock, "zone": zone, "brand": brand, "barcode": barcode, "active": active,
		}
		if category != nil {
			p["category"] = *category
		}
		products = append(products, p)
	}
	if products == nil {
		products = []map[string]any{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"products": products, "page": page, "limit": limit})
}

func (h CatalogHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	darkstoreID := r.URL.Query().Get("darkstore_id")
	_ = darkstoreID
	rows, err := h.Pool.Query(r.Context(), `SELECT id, name, parent_id FROM categories ORDER BY id`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer rows.Close()
	var categories []map[string]any
	for rows.Next() {
		var id string
		var parentID *string
		var name []byte
		if err := rows.Scan(&id, &name, &parentID); err != nil {
			writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		var nameObj any
		_ = json.Unmarshal(name, &nameObj)
		c := map[string]any{"id": id, "name": nameObj}
		if parentID != nil {
			c["parent_id"] = *parentID
		}
		categories = append(categories, c)
	}
	if categories == nil {
		categories = []map[string]any{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"categories": categories})
}

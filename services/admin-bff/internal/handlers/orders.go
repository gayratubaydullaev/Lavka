package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OrdersHandler struct {
	Pool *pgxpool.Pool
}

func (h OrdersHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.Pool.Query(r.Context(), `
		SELECT id, status, darkstore_id, customer_id, subtotal, delivery_fee, total_amount, delivery_address, payment_method, created_at
		FROM orders ORDER BY created_at DESC LIMIT 50
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer rows.Close()
	var orders []map[string]any
	for rows.Next() {
		var id, status, dsID, customerID, paymentMethod string
		var subtotal, deliveryFee, total int
		var address []byte
		var createdAt any
		if err := rows.Scan(&id, &status, &dsID, &customerID, &subtotal, &deliveryFee, &total, &address, &paymentMethod, &createdAt); err != nil {
			writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		var addr any
		_ = json.Unmarshal(address, &addr)
		orders = append(orders, map[string]any{
			"id": id, "status": status, "darkstore_id": dsID, "customer_id": customerID,
			"subtotal": subtotal, "delivery_fee": deliveryFee, "total_amount": total,
			"delivery_address": addr, "payment_method": paymentMethod, "created_at": createdAt,
		})
	}
	if orders == nil {
		orders = []map[string]any{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"orders": orders})
}

func (h OrdersHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body struct {
		DarkstoreID     string `json:"darkstore_id"`
		CustomerID      string `json:"customer_id"`
		PaymentMethod   string `json:"payment_method"`
		DeliveryAddress any    `json:"delivery_address"`
		Items           []struct {
			ProductID string `json:"product_id"`
			Quantity  int    `json:"quantity"`
		} `json:"items"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON")
		return
	}
	if body.DarkstoreID == "" || len(body.Items) == 0 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "darkstore_id and items required")
		return
	}
	if body.CustomerID == "" {
		body.CustomerID = "cust-dilshod"
	}

	orderID := uuid.New().String()
	subtotal := 0
	type line struct {
		productID, name, zone string
		qty, price            int
	}
	var lines []line

	for _, item := range body.Items {
		var name []byte
		var price int
		var zone string
		err := h.Pool.QueryRow(r.Context(), `
			SELECT name, price, zone FROM products WHERE id = $1 AND darkstore_id = $2
		`, item.ProductID, body.DarkstoreID).Scan(&name, &price, &zone)
		if err != nil {
			writeError(w, http.StatusBadRequest, "PRODUCT_NOT_FOUND", item.ProductID)
			return
		}
		var nameObj map[string]string
		_ = json.Unmarshal(name, &nameObj)
		displayName := nameObj["ru"]
		if displayName == "" {
			displayName = item.ProductID
		}
		subtotal += price * item.Quantity
		lines = append(lines, line{item.ProductID, displayName, zone, item.Quantity, price})
	}

	deliveryFee := 15000
	if subtotal >= 150000 {
		deliveryFee = 0
	}
	total := subtotal + deliveryFee
	addrJSON, _ := json.Marshal(body.DeliveryAddress)

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer tx.Rollback(r.Context())

	_, err = tx.Exec(r.Context(), `
		INSERT INTO orders (id, status, darkstore_id, customer_id, subtotal, delivery_fee, total_amount, delivery_address, payment_method)
		VALUES ($1, 'NEW', $2, $3, $4, $5, $6, $7, $8)
	`, orderID, body.DarkstoreID, body.CustomerID, subtotal, deliveryFee, total, addrJSON, body.PaymentMethod)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	for _, ln := range lines {
		_, err = tx.Exec(r.Context(), `
			INSERT INTO order_items (order_id, product_id, name, quantity, price, zone)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, orderID, ln.productID, ln.name, ln.qty, ln.price, ln.zone)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"order_id":     orderID,
		"status":       "NEW",
		"total_amount": total,
		"delivery_fee": deliveryFee,
		"subtotal":     subtotal,
	})
}

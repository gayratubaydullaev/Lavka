package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AdminHandler struct {
	Pool *pgxpool.Pool
}

func (h AdminHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	darkstoreID := chi.URLParam(r, "id")
	var ordersToday, activeOrders int
	var gmvToday int64
	err := h.Pool.QueryRow(r.Context(), `
		SELECT
			COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE),
			COUNT(*) FILTER (WHERE status NOT IN ('DELIVERED','CANCELLED','CANCELLED_BY_USER')),
			COALESCE(SUM(total_amount) FILTER (WHERE created_at::date = CURRENT_DATE), 0)
		FROM orders WHERE darkstore_id = $1
	`, darkstoreID).Scan(&ordersToday, &activeOrders, &gmvToday)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	var pickersOnline, couriersOnRoute int
	_ = h.Pool.QueryRow(r.Context(), `
		SELECT
			COUNT(*) FILTER (WHERE role = 'picker' AND online),
			COUNT(*) FILTER (WHERE role = 'courier' AND online)
		FROM staff WHERE darkstore_id = $1
	`, darkstoreID).Scan(&pickersOnline, &couriersOnRoute)

	alerts := []map[string]any{
		{
			"id": "1", "type": "sla_breach",
			"message": "Заказ просрочен на 2 мин", "severity": "critical",
			"created_at": nowISO(),
		},
		{
			"id": "2", "type": "low_stock",
			"message": "Низкий остаток: Молоко", "severity": "warning",
			"created_at": nowISO(),
		},
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"darkstore_id":         darkstoreID,
		"active_orders":        activeOrders,
		"pickers_online":       pickersOnline,
		"couriers_on_route":    couriersOnRoute,
		"orders_today":         ordersToday,
		"avg_assembly_minutes": 12.3,
		"alerts":               alerts,
		"gmv_today":            gmvToday,
	})
}

func (h AdminHandler) ListDarkstores(w http.ResponseWriter, r *http.Request) {
	rows, err := h.Pool.Query(r.Context(), `
		SELECT d.id, d.city, d.city_ru, d.name, d.radius_km, d.sku_count,
			COUNT(p.id) FILTER (WHERE p.active) AS sku_actual,
			COUNT(o.id) FILTER (WHERE o.created_at::date = CURRENT_DATE) AS orders_today,
			COALESCE(SUM(o.total_amount) FILTER (WHERE o.created_at::date = CURRENT_DATE), 0) AS gmv_today
		FROM darkstores d
		LEFT JOIN products p ON p.darkstore_id = d.id
		LEFT JOIN orders o ON o.darkstore_id = d.id
		GROUP BY d.id ORDER BY d.city
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer rows.Close()
	var stores []map[string]any
	for rows.Next() {
		var id, city, cityRu, name string
		var radius float64
		var skuCount, skuActual, ordersToday int
		var gmvToday int64
		if err := rows.Scan(&id, &city, &cityRu, &name, &radius, &skuCount, &skuActual, &ordersToday, &gmvToday); err != nil {
			writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		stores = append(stores, map[string]any{
			"id": id, "city": city, "city_ru": cityRu, "name": name,
			"radius_km": radius, "sku_count": skuActual,
			"orders_today": ordersToday, "gmv_today": gmvToday,
		})
	}
	if stores == nil {
		stores = []map[string]any{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"darkstores": stores})
}

func (h AdminHandler) ListInventory(w http.ResponseWriter, r *http.Request) {
	darkstoreID := r.URL.Query().Get("darkstore_id")
	query := `
		SELECT id, darkstore_id, name, price, weight_g, is_halal, images, stock, zone, category, brand, barcode, active
		FROM products WHERE 1=1`
	args := []any{}
	if darkstoreID != "" {
		query += ` AND darkstore_id = $1`
		args = append(args, darkstoreID)
	}
	query += ` ORDER BY id LIMIT 500`

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer rows.Close()

	items := make([]map[string]any, 0)
	for rows.Next() {
		item, err := scanProductRow(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		items = append(items, item)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h AdminHandler) PatchInventory(w http.ResponseWriter, r *http.Request) {
	skuID := chi.URLParam(r, "sku_id")
	var body struct {
		Price         *int  `json:"price"`
		Stock         *int  `json:"stock"`
		QuantityDelta *int  `json:"quantity_delta"`
		Active        *bool `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON")
		return
	}

	setParts := []string{}
	args := []any{}
	argN := 1
	if body.Price != nil {
		setParts = append(setParts, "price = $"+itoa(argN))
		args = append(args, *body.Price)
		argN++
	}
	if body.Stock != nil {
		setParts = append(setParts, "stock = $"+itoa(argN))
		args = append(args, *body.Stock)
		argN++
	}
	if body.QuantityDelta != nil {
		setParts = append(setParts, "stock = stock + $"+itoa(argN))
		args = append(args, *body.QuantityDelta)
		argN++
	}
	if body.Active != nil {
		setParts = append(setParts, "active = $"+itoa(argN))
		args = append(args, *body.Active)
		argN++
	}
	if len(setParts) == 0 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "No fields to update")
		return
	}

	args = append(args, skuID)
	query := `UPDATE products SET ` + strings.Join(setParts, ", ") + ` WHERE id = $` + itoa(argN) + `
		RETURNING id, darkstore_id, name, price, weight_g, is_halal, images, stock, zone, category, brand, barcode, active`

	row := h.Pool.QueryRow(r.Context(), query, args...)
	item, err := scanProductRow(row)
	if err != nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "SKU not found")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h AdminHandler) ListStaff(w http.ResponseWriter, r *http.Request) {
	darkstoreID := r.URL.Query().Get("darkstore_id")
	role := r.URL.Query().Get("role")

	query := `SELECT id, name, role, darkstore_id, online, rating, zone_certifications, shift_started_at FROM staff WHERE 1=1`
	args := []any{}
	argN := 1
	if darkstoreID != "" {
		query += ` AND darkstore_id = $` + itoa(argN)
		args = append(args, darkstoreID)
		argN++
	}
	if role != "" {
		query += ` AND role = $` + itoa(argN)
		args = append(args, role)
	}

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer rows.Close()

	staff := make([]map[string]any, 0)
	for rows.Next() {
		var id, name, roleVal, dsID string
		var online bool
		var rating float64
		var zones []byte
		var shiftStarted *time.Time
		if err := rows.Scan(&id, &name, &roleVal, &dsID, &online, &rating, &zones, &shiftStarted); err != nil {
			writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		var zoneList any
		_ = json.Unmarshal(zones, &zoneList)
		m := map[string]any{
			"id": id, "name": name, "role": roleVal, "darkstore_id": dsID,
			"online": online, "rating": rating, "zone_certifications": zoneList,
		}
		if shiftStarted != nil {
			m["shift_started_at"] = shiftStarted.Format(time.RFC3339)
		} else {
			m["shift_started_at"] = nil
		}
		staff = append(staff, m)
	}
	writeJSON(w, http.StatusOK, map[string]any{"staff": staff})
}

func (h AdminHandler) PatchStaffShift(w http.ResponseWriter, r *http.Request) {
	staffID := chi.URLParam(r, "id")
	var body struct {
		Action string `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON")
		return
	}

	var query string
	switch body.Action {
	case "start":
		query = `UPDATE staff SET online = true, shift_started_at = NOW() WHERE id = $1
			RETURNING id, name, role, darkstore_id, online, rating, zone_certifications, shift_started_at`
	case "stop":
		query = `UPDATE staff SET online = false, shift_started_at = NULL WHERE id = $1
			RETURNING id, name, role, darkstore_id, online, rating, zone_certifications, shift_started_at`
	default:
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "action must be start or stop")
		return
	}

	var id, name, roleVal, dsID string
	var online bool
	var rating float64
	var zones []byte
	var shiftStarted *time.Time
	err := h.Pool.QueryRow(r.Context(), query, staffID).Scan(
		&id, &name, &roleVal, &dsID, &online, &rating, &zones, &shiftStarted,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Staff not found")
		return
	}
	var zoneList any
	_ = json.Unmarshal(zones, &zoneList)
	m := map[string]any{
		"id": id, "name": name, "role": roleVal, "darkstore_id": dsID,
		"online": online, "rating": rating, "zone_certifications": zoneList,
	}
	if shiftStarted != nil {
		m["shift_started_at"] = shiftStarted.Format(time.RFC3339)
	} else {
		m["shift_started_at"] = nil
	}
	writeJSON(w, http.StatusOK, m)
}

func (h AdminHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
	darkstoreID := r.URL.Query().Get("darkstore_id")
	status := r.URL.Query().Get("status")

	query := `
		SELECT id, status, darkstore_id, customer_id, subtotal, delivery_fee, total_amount,
			delivery_address, payment_method, created_at
		FROM orders WHERE 1=1`
	args := []any{}
	argN := 1
	if darkstoreID != "" {
		query += ` AND darkstore_id = $` + itoa(argN)
		args = append(args, darkstoreID)
		argN++
	}
	if status != "" {
		query += ` AND status = $` + itoa(argN)
		args = append(args, status)
	}
	query += ` ORDER BY created_at DESC LIMIT 100`

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer rows.Close()

	orders := make([]map[string]any, 0)
	for rows.Next() {
		order, err := scanOrderRow(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		order["eta_minutes"] = etaForStatus(order["status"].(string))
		orders = append(orders, order)
	}
	writeJSON(w, http.StatusOK, map[string]any{"orders": orders})
}

func (h AdminHandler) ReassignOrder(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func etaForStatus(status string) any {
	switch status {
	case "ACCEPTED", "NEW":
		return 18
	case "ASSEMBLY":
		return 15
	case "READY":
		return 12
	case "IN_DELIVERY":
		return 8
	default:
		return nil
	}
}

func itoa(n int) string {
	return strconv.Itoa(n)
}

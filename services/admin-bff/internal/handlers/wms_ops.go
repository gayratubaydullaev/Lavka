package handlers

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type wmsCell struct {
	ID              string  `json:"id"`
	Zone            string  `json:"zone"`
	Code            string  `json:"code"`
	CapacityKg      float64 `json:"capacity_kg"`
	OccupiedKg      float64 `json:"occupied_kg"`
	TemperatureZone string  `json:"temperature_zone"`
}

type wmsPOItem struct {
	SKUID         string `json:"sku_id"`
	Name          string `json:"name"`
	Barcode       string `json:"barcode"`
	ExpectedQty   int    `json:"expected_qty"`
	Zone          string `json:"zone"`
	IsMarked      bool   `json:"is_marked"`
	MinExpiryDays int    `json:"min_expiry_days"`
}

type wmsPO struct {
	ID       string      `json:"id"`
	Supplier string      `json:"supplier"`
	Status   string      `json:"status"`
	Items    []wmsPOItem `json:"items"`
}

type wmsReceipt struct {
	ID            string           `json:"id"`
	PONumber      string           `json:"po_number"`
	Supplier      string           `json:"supplier"`
	Status        string           `json:"status"`
	Scanned       []map[string]any `json:"scanned"`
	Discrepancies []map[string]any `json:"discrepancies"`
	FrozenTempC   *float64         `json:"frozen_temp_c"`
}

var (
	wmsState = struct {
		sync.RWMutex
		cells             []wmsCell
		purchaseOrders    []wmsPO
		receipts          map[string]*wmsReceipt
		pendingPlacements []map[string]any
	}{receipts: map[string]*wmsReceipt{}}
)

func init() {
	wmsState.cells = buildWMSCells()
	wmsState.purchaseOrders = []wmsPO{
		{
			ID: "PO-2026-001", Supplier: "Korzinka Supply", Status: "open",
			Items: []wmsPOItem{
				{SKUID: "prod-milk-001", Name: "Молоко 3.2%", Barcode: "4600123456789", ExpectedQty: 10, Zone: "A", IsMarked: true, MinExpiryDays: 7},
				{SKUID: "prod-bread-002", Name: "Хлеб белый", Barcode: "4600987654321", ExpectedQty: 12, Zone: "B", IsMarked: true, MinExpiryDays: 3},
				{SKUID: "prod-rice-003", Name: "Рис", Barcode: "4600111122222", ExpectedQty: 14, Zone: "B", IsMarked: false, MinExpiryDays: 30},
			},
		},
		{
			ID: "PO-2026-002", Supplier: "UzAgro Fresh", Status: "open",
			Items: []wmsPOItem{
				{SKUID: "prod-frozen-004", Name: "Пельмени", Barcode: "4600333344444", ExpectedQty: 20, Zone: "C", IsMarked: false, MinExpiryDays: 30},
			},
		},
	}
}

func buildWMSCells() []wmsCell {
	zones := []string{"A", "B", "C", "D", "E", "F"}
	cells := []wmsCell{}
	for _, z := range zones {
		count := 20
		if z == "A" {
			count = 40
		} else if z == "B" {
			count = 60
		}
		for i := 1; i <= count; i++ {
			temp := "ambient"
			if z == "C" {
				temp = "frozen"
			} else if z == "A" {
				temp = "chilled"
			}
			cells = append(cells, wmsCell{
				ID: "cell-" + z + "-" + itoa(i), Zone: z,
				Code: z + "-" + pad2(i), CapacityKg: 100, OccupiedKg: 10,
				TemperatureZone: temp,
			})
		}
	}
	return cells
}

func pad2(n int) string {
	if n < 10 {
		return "0" + itoa(n)
	}
	return itoa(n)
}

func (h WMSHandler) ListPurchaseOrders(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	wmsState.RLock()
	defer wmsState.RUnlock()
	list := wmsState.purchaseOrders
	if status != "" {
		filtered := []wmsPO{}
		for _, po := range list {
			if po.Status == status {
				filtered = append(filtered, po)
			}
		}
		list = filtered
	}
	writeJSON(w, http.StatusOK, map[string]any{"purchase_orders": list})
}

func (h WMSHandler) ListCells(w http.ResponseWriter, r *http.Request) {
	zone := r.URL.Query().Get("zone")
	wmsState.RLock()
	defer wmsState.RUnlock()
	cells := wmsState.cells
	if zone != "" {
		filtered := []wmsCell{}
		for _, c := range cells {
			if c.Zone == zone {
				filtered = append(filtered, c)
			}
		}
		cells = filtered
	}
	writeJSON(w, http.StatusOK, map[string]any{"cells": cells})
}

func (h WMSHandler) CreateReceipt(w http.ResponseWriter, r *http.Request) {
	var body struct {
		PONumber string `json:"po_number"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	wmsState.Lock()
	defer wmsState.Unlock()
	var po *wmsPO
	for i := range wmsState.purchaseOrders {
		if wmsState.purchaseOrders[i].ID == body.PONumber {
			po = &wmsState.purchaseOrders[i]
			break
		}
	}
	if po == nil {
		writeError(w, http.StatusNotFound, "PO_NOT_FOUND", "Purchase order not found")
		return
	}
	id := uuid.New().String()
	rec := &wmsReceipt{
		ID: id, PONumber: po.ID, Supplier: po.Supplier,
		Status: "in_progress", Scanned: []map[string]any{}, Discrepancies: []map[string]any{},
	}
	wmsState.receipts[id] = rec
	writeJSON(w, http.StatusCreated, rec)
}

func findPOItem(poID, barcode string) *wmsPOItem {
	for i := range wmsState.purchaseOrders {
		if wmsState.purchaseOrders[i].ID != poID {
			continue
		}
		for j := range wmsState.purchaseOrders[i].Items {
			if wmsState.purchaseOrders[i].Items[j].Barcode == barcode {
				return &wmsState.purchaseOrders[i].Items[j]
			}
		}
	}
	return nil
}

func (h WMSHandler) ScanReceipt(w http.ResponseWriter, r *http.Request) {
	receiptID := chi.URLParam(r, "receipt_id")
	var body struct {
		Barcode    string  `json:"barcode"`
		Quantity   int     `json:"quantity"`
		ExpiryDate string  `json:"expiry_date"`
		AslCode    string  `json:"asl_code"`
		Damage     bool    `json:"damage"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.Quantity == 0 {
		body.Quantity = 1
	}
	wmsState.Lock()
	defer wmsState.Unlock()
	rec, ok := wmsState.receipts[receiptID]
	if !ok {
		writeError(w, http.StatusNotFound, "NOT_FOUND", receiptID)
		return
	}
	item := findPOItem(rec.PONumber, body.Barcode)
	if item == nil {
		writeError(w, http.StatusNotFound, "BARCODE_NOT_IN_PO", body.Barcode)
		return
	}
	if item.IsMarked && body.AslCode == "" {
		writeError(w, http.StatusUnprocessableEntity, "ASL_REQUIRED", "ASL code required for marked goods")
		return
	}
	rec.Scanned = append(rec.Scanned, map[string]any{
		"barcode": body.Barcode, "sku_id": item.SKUID, "quantity": body.Quantity,
		"expiry_date": body.ExpiryDate, "asl_code": body.AslCode, "damage": body.Damage,
		"scanned_at": time.Now().Format(time.RFC3339),
	})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "scanned_count": len(rec.Scanned)})
}

func (h WMSHandler) FrozenTemp(w http.ResponseWriter, r *http.Request) {
	receiptID := chi.URLParam(r, "receipt_id")
	var body struct {
		TemperatureC float64 `json:"temperature_c"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	wmsState.Lock()
	defer wmsState.Unlock()
	rec, ok := wmsState.receipts[receiptID]
	if !ok {
		writeError(w, http.StatusNotFound, "NOT_FOUND", receiptID)
		return
	}
	if body.TemperatureC > -15 {
		writeError(w, http.StatusUnprocessableEntity, "TEMP_TOO_HIGH", "Температура заморозки должна быть ≤ −15°C")
		return
	}
	rec.FrozenTempC = &body.TemperatureC
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "frozen_temp_c": body.TemperatureC})
}

func recommendCells(zone string) []map[string]any {
	wmsState.RLock()
	defer wmsState.RUnlock()
	out := []map[string]any{}
	for _, c := range wmsState.cells {
		if c.Zone == zone && c.OccupiedKg < c.CapacityKg*0.8 {
			out = append(out, map[string]any{
				"cell_id": c.ID, "cell_code": c.Code, "zone": c.Zone, "score": 0.9,
			})
			if len(out) >= 3 {
				break
			}
		}
	}
	return out
}

func (h WMSHandler) CompleteReceipt(w http.ResponseWriter, r *http.Request) {
	receiptID := chi.URLParam(r, "receipt_id")
	wmsState.Lock()
	defer wmsState.Unlock()
	rec, ok := wmsState.receipts[receiptID]
	if !ok {
		writeError(w, http.StatusNotFound, "NOT_FOUND", receiptID)
		return
	}
	hasFrozen := false
	for _, s := range rec.Scanned {
		item := findPOItem(rec.PONumber, s["barcode"].(string))
		if item != nil && item.Zone == "C" {
			hasFrozen = true
			break
		}
	}
	if hasFrozen && rec.FrozenTempC == nil {
		writeError(w, http.StatusUnprocessableEntity, "FROZEN_TEMP_REQUIRED", "Укажите температуру при приёмке заморозки")
		return
	}
	rec.Status = "completed"
	for i := range wmsState.purchaseOrders {
		if wmsState.purchaseOrders[i].ID == rec.PONumber {
			wmsState.purchaseOrders[i].Status = "received"
			break
		}
	}
	recommendations := []map[string]any{}
	for _, s := range rec.Scanned {
		item := findPOItem(rec.PONumber, s["barcode"].(string))
		zone := "B"
		if item != nil {
			zone = item.Zone
		}
		for _, recCell := range recommendCells(zone) {
			recCell["sku_id"] = s["sku_id"]
			recCell["barcode"] = s["barcode"]
			recommendations = append(recommendations, recCell)
			wmsState.pendingPlacements = append(wmsState.pendingPlacements, map[string]any{
				"barcode": s["barcode"], "cell_code": recCell["cell_code"],
				"receipt_id": receiptID, "sku_id": s["sku_id"],
			})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok": true, "status": "completed", "placement_recommendations": recommendations,
	})
}

func (h WMSHandler) PlaceItem(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SKUID    string `json:"sku_id"`
		CellCode string `json:"cell_code"`
		Barcode  string `json:"barcode"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	wmsState.Lock()
	defer wmsState.Unlock()
	var cell *wmsCell
	for i := range wmsState.cells {
		if wmsState.cells[i].Code == body.CellCode {
			cell = &wmsState.cells[i]
			break
		}
	}
	if cell == nil {
		writeError(w, http.StatusNotFound, "CELL_NOT_FOUND", body.CellCode)
		return
	}
	cell.OccupiedKg += 5
	filtered := []map[string]any{}
	for _, p := range wmsState.pendingPlacements {
		if p["barcode"] != body.Barcode {
			filtered = append(filtered, p)
		}
	}
	wmsState.pendingPlacements = filtered
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "cell_code": body.CellCode, "zone": cell.Zone})
}

func (h WMSHandler) PendingPlacements(w http.ResponseWriter, r *http.Request) {
	wmsState.RLock()
	defer wmsState.RUnlock()
	writeJSON(w, http.StatusOK, map[string]any{"pending": wmsState.pendingPlacements})
}

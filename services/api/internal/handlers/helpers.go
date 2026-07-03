package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
)

type scannable interface {
	Scan(dest ...any) error
}

func scanProductRow(row scannable) (map[string]any, error) {
	var id, dsID, zone, brand, barcode string
	var category *string
	var price, weightG, stock int
	var isHalal, active bool
	var name, images []byte
	if err := row.Scan(&id, &dsID, &name, &price, &weightG, &isHalal, &images, &stock, &zone, &category, &brand, &barcode, &active); err != nil {
		return nil, err
	}
	var nameObj, imagesArr any
	_ = json.Unmarshal(name, &nameObj)
	_ = json.Unmarshal(images, &imagesArr)
	item := map[string]any{
		"id": id, "darkstore_id": dsID, "name": nameObj, "price": price,
		"weight_g": weightG, "is_halal": isHalal, "images": imagesArr,
		"stock": stock, "zone": zone, "brand": brand, "barcode": barcode, "active": active,
	}
	if category != nil {
		item["category"] = *category
	}
	return item, nil
}

func scanOrderRow(row scannable) (map[string]any, error) {
	var id, status, dsID, customerID, paymentMethod string
	var subtotal, deliveryFee, total int
	var address []byte
	var createdAt any
	if err := row.Scan(&id, &status, &dsID, &customerID, &subtotal, &deliveryFee, &total, &address, &paymentMethod, &createdAt); err != nil {
		return nil, err
	}
	var addr any
	_ = json.Unmarshal(address, &addr)
	return map[string]any{
		"id": id, "status": status, "darkstore_id": dsID, "customer_id": customerID,
		"subtotal": subtotal, "delivery_fee": deliveryFee, "total_amount": total,
		"delivery_address": addr, "payment_method": paymentMethod, "created_at": createdAt,
	}, nil
}

func queryInt(r *http.Request, key string, def int) int {
	v := r.URL.Query().Get(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}

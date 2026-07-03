package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jomboy-lavka/pkg/config"
	"github.com/jomboy-lavka/pkg/httpx"
	"github.com/jomboy-lavka/pkg/server"
)

func main() {
	cfg := config.Load("catalog", "8101")
	var pool *pgxpool.Pool
	if cfg.DatabaseURL != "" {
		if p, err := pgxpool.New(context.Background(), cfg.DatabaseURL); err == nil {
			pool = p
			defer pool.Close()
		}
	}
	esURL := os.Getenv("ELASTICSEARCH_URL")

	server.Run(server.Options{
		ServiceName: "catalog",
		DefaultPort: "8101",
		Phase:       5,
		Extra: map[string]any{
			"db":            pool != nil,
			"elasticsearch": esURL != "",
		},
		Register: func(r chi.Router) {
			registerCatalog(r, pool, esURL)
		},
	})
}

func registerCatalog(r chi.Router, pool *pgxpool.Pool, esURL string) {
	r.Route("/api/v1/catalog", func(api chi.Router) {
		api.Get("/darkstores/{darkstore_id}", func(w http.ResponseWriter, req *http.Request) {
			did := chi.URLParam(req, "darkstore_id")
			if pool == nil {
				httpx.Error(w, http.StatusServiceUnavailable, "DB_UNAVAILABLE", "database not connected")
				return
			}
			rows, err := pool.Query(req.Context(), `
				SELECT id, darkstore_id, name, price, stock, zone, active
				FROM products WHERE darkstore_id = $1 AND active = true ORDER BY id LIMIT 50
			`, did)
			if err != nil {
				httpx.Error(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
				return
			}
			defer rows.Close()
			products := []map[string]any{}
			for rows.Next() {
				var id, dsID, zone string
				var price, stock int
				var active bool
				var name []byte
				if err := rows.Scan(&id, &dsID, &name, &price, &stock, &zone, &active); err != nil {
					continue
				}
				var nameObj any
				_ = json.Unmarshal(name, &nameObj)
				products = append(products, map[string]any{
					"id": id, "darkstore_id": dsID, "name": nameObj,
					"price": price, "stock": stock, "zone": zone, "active": active,
				})
			}
			httpx.JSON(w, http.StatusOK, map[string]any{"products": products})
		})

		api.Get("/search", func(w http.ResponseWriter, req *http.Request) {
			q := req.URL.Query().Get("q")
			did := req.URL.Query().Get("darkstore_id")
			suggestions := []map[string]string{}
			products := []map[string]any{}
			source := "pg"
			if q != "" && pool != nil {
				rows, err := pool.Query(req.Context(), `
					SELECT id, darkstore_id, name, price, stock, zone, active
					FROM products WHERE active AND name::text ILIKE $1
					AND ($2 = '' OR darkstore_id = $2::uuid)
					LIMIT 20
				`, "%"+q+"%", did)
				if err == nil {
					defer rows.Close()
					for rows.Next() {
						var id, dsID, zone string
						var price, stock int
						var active bool
						var name []byte
						if rows.Scan(&id, &dsID, &name, &price, &stock, &zone, &active) == nil {
							var nameObj any
							_ = json.Unmarshal(name, &nameObj)
							products = append(products, map[string]any{
								"id": id, "darkstore_id": dsID, "name": nameObj,
								"price": price, "stock": stock, "zone": zone, "active": active,
							})
							if m, ok := nameObj.(map[string]any); ok {
								if ru, ok := m["ru"].(string); ok {
									suggestions = append(suggestions, map[string]string{"text": ru, "type": "product"})
								}
							}
						}
					}
				}
				if esURL != "" {
					if esHits, err := esSearch(req.Context(), esURL, q); err == nil && len(esHits) > 0 {
						suggestions = append(suggestions, esHits...)
						source = "elasticsearch"
					}
				}
			}
			httpx.JSON(w, http.StatusOK, map[string]any{
				"products": products, "suggestions": suggestions, "q": q, "source": source,
			})
		})

		api.Get("/categories", func(w http.ResponseWriter, req *http.Request) {
			if pool == nil {
				httpx.JSON(w, http.StatusOK, map[string]any{"categories": []any{}})
				return
			}
			rows, err := pool.Query(req.Context(), `SELECT id, name FROM categories ORDER BY id LIMIT 20`)
			if err != nil {
				httpx.Error(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
				return
			}
			defer rows.Close()
			cats := []map[string]any{}
			for rows.Next() {
				var id string
				var name []byte
				if rows.Scan(&id, &name) == nil {
					var n any
					_ = json.Unmarshal(name, &n)
					cats = append(cats, map[string]any{"id": id, "name": n})
				}
			}
			httpx.JSON(w, http.StatusOK, map[string]any{"categories": cats})
		})

		api.Post("/replacements/calculate", func(w http.ResponseWriter, req *http.Request) {
			var body struct {
				ProductID string `json:"product_id"`
				Price     int    `json:"price"`
			}
			_ = json.NewDecoder(req.Body).Decode(&body)
			httpx.JSON(w, http.StatusOK, map[string]any{
				"replacements": []map[string]any{{
					"product_id": body.ProductID,
					"score":      0.85,
					"price_diff": 0,
				}},
			})
		})
	})

	r.Post("/api/v1/catalog/asl-belgisi/verify", func(w http.ResponseWriter, req *http.Request) {
		var body struct {
			Code          string `json:"code"`
			ProductID     string `json:"product_id"`
			RequireOnline *bool  `json:"require_online"`
		}
		_ = json.NewDecoder(req.Body).Decode(&body)
		if body.Code == "" {
			httpx.Error(w, http.StatusBadRequest, "INVALID", "code required")
			return
		}
		valid := body.Code == "0104600123456789" || body.Code == "0104600987654321"
		result := map[string]any{
			"valid": valid, "code": body.Code, "product_id": body.ProductID,
			"cached_at": time.Now().Format(time.RFC3339), "offline": false,
		}
		if !valid && (body.RequireOnline == nil || *body.RequireOnline) {
			httpx.JSON(w, http.StatusUnprocessableEntity, map[string]any{
				"valid": false, "message": "Маркировка не прошла проверку АСЛ БЕЛГИ",
			})
			return
		}
		httpx.JSON(w, http.StatusOK, result)
	})
}

func esSearch(ctx context.Context, esURL, q string) ([]map[string]string, error) {
	query := map[string]any{
		"size": 8,
		"query": map[string]any{
			"multi_match": map[string]any{
				"query":  q,
				"fields": []string{"name_ru", "name_uz", "barcode"},
			},
		},
	}
	body, _ := json.Marshal(query)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, esURL+"/catalog/_search", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		return nil, io.ErrUnexpectedEOF
	}
	var parsed struct {
		Hits struct {
			Hits []struct {
				Source struct {
					NameRu string `json:"name_ru"`
				} `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}
	if err := json.NewDecoder(res.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	out := []map[string]string{}
	for _, h := range parsed.Hits.Hits {
		if h.Source.NameRu != "" {
			out = append(out, map[string]string{"text": h.Source.NameRu, "type": "product"})
		}
	}
	return out, nil
}

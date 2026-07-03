package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jomboy-lavka/api/internal/config"
	"github.com/jomboy-lavka/api/internal/middleware"
)

const defaultDarkstore = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

func NewRouter(cfg config.Config, pool *pgxpool.Pool) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Auth(cfg.DevAuth))

	auth := AuthHandler{}
	catalog := CatalogHandler{Pool: pool}
	orders := OrdersHandler{Pool: pool}
	admin := AdminHandler{Pool: pool}
	health := HealthHandler{Pool: pool, DarkstoreID: defaultDarkstore}

	r.Route("/api/v1", func(api chi.Router) {
		api.Get("/health", health.ServeHTTP)
		api.Post("/auth/otp/send", auth.SendOTP)
		api.Post("/auth/otp/verify", auth.VerifyOTP)

		api.Get("/catalog/darkstores/{darkstore_id}", catalog.ListProducts)
		api.Get("/catalog/categories", catalog.ListCategories)

		api.Get("/orders", orders.List)
		api.Post("/orders", orders.Create)

		api.Get("/darkstores", admin.ListDarkstores)
		api.Get("/admin/darkstores/{id}/dashboard", admin.Dashboard)
		api.Get("/admin/orders", admin.ListOrders)
		api.Post("/admin/orders/{id}/reassign", admin.ReassignOrder)
		api.Get("/admin/inventory", admin.ListInventory)
		api.Patch("/admin/inventory/{sku_id}", admin.PatchInventory)
		api.Get("/admin/staff", admin.ListStaff)
		api.Patch("/admin/staff/{id}/shift", admin.PatchStaffShift)
	})

	return r
}

package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jomboy-lavka/admin-bff/internal/config"
	"github.com/jomboy-lavka/admin-bff/internal/middleware"
)

const defaultDarkstore = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

func NewRouter(cfg config.Config, pool *pgxpool.Pool) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Auth(cfg.DevAuth))

	auth := AuthHandler{}
	catalog := CatalogHandler{Pool: pool}
	orders := OrdersHandler{Pool: pool}
	admin := AdminHandler{Pool: pool}
	audit := AuditHandler{Pool: pool}
	hq := HQHandler{Pool: pool}
	fraud := &FraudHandler{}
	wms := WMSHandler{Pool: pool}
	health := HealthHandler{Pool: pool, DarkstoreID: defaultDarkstore}

	r.Get("/health", health.ServeHTTP)
	r.Get("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		health.ServeHTTP(w, r)
	})

	r.Route("/api/v1", func(api chi.Router) {
		api.Post("/auth/otp/send", auth.SendOTP)
		api.Post("/auth/otp/verify", auth.VerifyOTP)

		api.Get("/catalog/darkstores/{darkstore_id}", catalog.ListProducts)
		api.Get("/catalog/categories", catalog.ListCategories)

		api.Get("/orders", orders.List)
		api.Post("/orders", orders.Create)

		api.Get("/darkstores", admin.ListDarkstores)
		api.Get("/darkstores/{id}", hq.DarkstoreDetail)
		api.Get("/admin/darkstores/{id}/dashboard", admin.Dashboard)
		api.Get("/admin/orders", admin.ListOrders)
		api.Post("/admin/orders/{id}/reassign", admin.ReassignOrder)
		api.Get("/admin/inventory", admin.ListInventory)
		api.Patch("/admin/inventory/{sku_id}", admin.PatchInventory)
		api.Get("/admin/staff", admin.ListStaff)
		api.Patch("/admin/staff/{id}/shift", admin.PatchStaffShift)
		api.Post("/admin/audit", audit.Record)
		api.Get("/admin/audit", audit.List)
		api.Get("/admin/audit/export", audit.Export)
		api.Get("/admin/reports/gmv", hq.ReportGMV)
		api.Get("/admin/reports/cohort", hq.ReportCohort)
		api.Get("/admin/reports/funnel", hq.ReportFunnel)
		api.Get("/admin/reports/bi-summary", hq.ReportBISummary)
		api.Get("/admin/reports/metabase-embed", hq.ReportMetabaseEmbed)
		api.Get("/admin/tariffs", hq.GetTariffs)
		api.Patch("/admin/tariffs", hq.PatchTariffs)
		api.Post("/admin/tariffs/preview", hq.PreviewTariffs)
		api.Post("/admin/tariffs/publish", hq.PublishTariffs)
		api.Get("/admin/fraud/stats", fraud.Stats)
		api.Get("/admin/fraud/blocked-orders", fraud.BlockedOrders)
		api.Post("/admin/fraud/blocked-orders/{id}/unblock", fraud.Unblock)
	})

	wms.Register(r)

	return r
}

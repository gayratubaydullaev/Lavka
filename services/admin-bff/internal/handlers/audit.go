package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AuditHandler struct {
	Pool *pgxpool.Pool
}

func (h AuditHandler) Record(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ActorID      string         `json:"actor_id"`
		Action       string         `json:"action"`
		ResourceType string         `json:"resource_type"`
		ResourceID   string         `json:"resource_id"`
		Payload      map[string]any `json:"payload"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if body.ActorID == "" {
		body.ActorID = "system"
	}
	payload, _ := json.Marshal(body.Payload)
	_, err := h.Pool.Exec(r.Context(), `
		INSERT INTO admin_audit_log (actor_id, action, resource_type, resource_id, payload)
		VALUES ($1, $2, $3, $4, $5)
	`, body.ActorID, body.Action, body.ResourceType, body.ResourceID, payload)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true})
}

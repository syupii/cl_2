package api

import (
	"net/http"
	"regexp"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/syupii/cl_2/backend/internal/httpx"
)

// UpdatePlanPriceRequest is the body for PUT /templates/plans/{id}.
type UpdatePlanPriceRequest struct {
	DefaultPrice string `json:"default_price" example:"1490"`
	Currency     string `json:"currency"      example:"JPY"`
}

var reCurrency = regexp.MustCompile(`^[A-Z]{3}$`)

// UpdatePlanPrice godoc
//
// @Summary      Update the price of a service plan
// @Tags         templates
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path      string                       true  "plan id (UUID)"
// @Param        body  body      api.UpdatePlanPriceRequest   true  "new price"
// @Success      200   {object}  httpx.Response
// @Failure      400   {object}  httpx.Response
// @Failure      401   {object}  httpx.Response
// @Failure      500   {object}  httpx.Response
// @Router       /templates/plans/{id} [put]
func (h *Handler) UpdatePlanPrice(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpx.BadRequest(w, "id must be a UUID")
		return
	}

	var req UpdatePlanPriceRequest
	if err := decodeJSON(r, &req); err != nil {
		httpx.BadRequest(w, err.Error())
		return
	}

	if req.DefaultPrice == "" {
		httpx.BadRequest(w, "default_price is required")
		return
	}
	if !reCurrency.MatchString(req.Currency) {
		httpx.BadRequest(w, "currency must be a 3-letter ISO code")
		return
	}

	if err := h.repo.UpdateServicePlanPrice(r.Context(), id, req.DefaultPrice, req.Currency); err != nil {
		httpx.Internal(w, err)
		return
	}

	httpx.OK(w, http.StatusOK, map[string]string{"status": "updated"})
}

package api

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/syupii/cl_2/backend/internal/auth"
	"github.com/syupii/cl_2/backend/internal/httpx"
)

// PaymentMethodDTO is the wire type for payment methods.
type PaymentMethodDTO struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// CreatePaymentMethodRequest is the request body for POST /payment-methods.
type CreatePaymentMethodRequest struct {
	Name string `json:"name"`
}

// ListPaymentMethods godoc
// @Summary      List payment methods
// @Tags         payment-methods
// @Produce      json
// @Success      200  {object}  httpx.Response
// @Security     BearerAuth
// @Router       /payment-methods [get]
func (h *Handler) ListPaymentMethods(w http.ResponseWriter, r *http.Request) {
	userID := auth.MustUserID(r.Context())
	rows, err := h.repo.ListPaymentMethods(r.Context(), userID)
	if err != nil {
		httpx.Internal(w, err)
		return
	}
	dtos := make([]PaymentMethodDTO, len(rows))
	for i, row := range rows {
		dtos[i] = PaymentMethodDTO{ID: row.ID.String(), Name: row.Name}
	}
	httpx.OK(w, http.StatusOK, map[string]any{"payment_methods": dtos})
}

// CreatePaymentMethod godoc
// @Summary      Create payment method
// @Tags         payment-methods
// @Accept       json
// @Produce      json
// @Param        body  body      CreatePaymentMethodRequest  true  "Payment method"
// @Success      201   {object}  httpx.Response
// @Security     BearerAuth
// @Router       /payment-methods [post]
func (h *Handler) CreatePaymentMethod(w http.ResponseWriter, r *http.Request) {
	userID := auth.MustUserID(r.Context())

	var req CreatePaymentMethodRequest
	if err := decodeJSON(r, &req); err != nil {
		httpx.BadRequest(w, "invalid request body")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		httpx.BadRequest(w, "name is required")
		return
	}
	if len(req.Name) > 100 {
		httpx.BadRequest(w, "name must be at most 100 characters")
		return
	}

	row, err := h.repo.CreatePaymentMethod(r.Context(), userID, req.Name)
	if err != nil {
		httpx.Internal(w, err)
		return
	}
	httpx.OK(w, http.StatusCreated, PaymentMethodDTO{ID: row.ID.String(), Name: row.Name})
}

// DeletePaymentMethod godoc
// @Summary      Delete payment method
// @Tags         payment-methods
// @Produce      json
// @Param        id   path      string  true  "Payment method ID"
// @Success      200  {object}  httpx.Response
// @Security     BearerAuth
// @Router       /payment-methods/{id} [delete]
func (h *Handler) DeletePaymentMethod(w http.ResponseWriter, r *http.Request) {
	userID := auth.MustUserID(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpx.BadRequest(w, "invalid id")
		return
	}
	if err := h.repo.DeletePaymentMethod(r.Context(), id, userID); err != nil {
		httpx.Internal(w, err)
		return
	}
	httpx.OK(w, http.StatusOK, nil)
}

package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/syupii/cl_2/backend/internal/auth"
	"github.com/syupii/cl_2/backend/internal/httpx"
	"github.com/syupii/cl_2/backend/internal/repository"
)

// ListSubscriptions godoc
//
// @Summary      List subscriptions for the authenticated user
// @Description  Returns every subscription owned by the caller, including
// @Description  cancelled ones, together with the effective monthly JPY cost
// @Description  computed by the backend.
// @Tags         subscriptions
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  httpx.Response{data=api.ListSubscriptionsResponse}
// @Failure      401  {object}  httpx.Response
// @Failure      500  {object}  httpx.Response
// @Router       /subscriptions [get]
func (h *Handler) ListSubscriptions(w http.ResponseWriter, r *http.Request) {
	userID := auth.MustUserID(r.Context())

	rows, err := h.repo.ListUserSubscriptions(r.Context(), userID)
	if err != nil {
		httpx.Internal(w, err)
		return
	}

	dtos, err := toSubscriptionDTOs(rows, h.conv)
	if err != nil {
		httpx.Internal(w, err)
		return
	}

	httpx.OK(w, http.StatusOK, ListSubscriptionsResponse{Subscriptions: dtos})
}

// CreateSubscription godoc
//
// @Summary      Register a new subscription
// @Description  Creates a subscription owned by the authenticated user.
// @Description  The user_id is taken from the JWT, never from the body.
// @Tags         subscriptions
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      api.CreateSubscriptionRequest  true  "subscription"
// @Success      201   {object}  httpx.Response{data=api.SubscriptionDTO}
// @Failure      400   {object}  httpx.Response
// @Failure      401   {object}  httpx.Response
// @Failure      500   {object}  httpx.Response
// @Router       /subscriptions [post]
func (h *Handler) CreateSubscription(w http.ResponseWriter, r *http.Request) {
	userID := auth.MustUserID(r.Context())

	var req CreateSubscriptionRequest
	if err := decodeJSON(r, &req); err != nil {
		httpx.BadRequest(w, err.Error())
		return
	}

	common, err := validateCommon(
		req.ServiceName, req.Price, req.Currency, req.BillingCycle, req.NextBillingDate, h.conv,
	)
	if err != nil {
		httpx.BadRequest(w, err.Error())
		return
	}

	if err := validateOptionalFields(req.PlanName, req.Category, req.Notes); err != nil {
		httpx.BadRequest(w, err.Error())
		return
	}

	if err := validateTrialEndDate(req.TrialEndDate); err != nil {
		httpx.BadRequest(w, err.Error())
		return
	}

	nextDate, _ := parseDate(common.NextBillingDate) // already validated

	params := repository.CreateUserSubscriptionParams{
		UserID:          userID,
		ServiceName:     common.ServiceName,
		PlanName:        pgTextFromPtr(req.PlanName),
		Price:           common.Price,
		Currency:        common.Currency,
		BillingCycle:    common.BillingCycle,
		NextBillingDate: nextDate,
		TrialEndDate:    pgDateFromPtr(req.TrialEndDate),
		Category:        pgTextFromPtr(req.Category),
		PaymentMethod:   pgTextFromPtr(req.PaymentMethod),
		Notes:           pgTextFromPtr(req.Notes),
		Status:          "active",
	}

	row, err := h.repo.CreateUserSubscription(r.Context(), params)
	if err != nil {
		httpx.Internal(w, err)
		return
	}

	dto, err := toSubscriptionDTO(row, h.conv)
	if err != nil {
		httpx.Internal(w, err)
		return
	}

	httpx.OK(w, http.StatusCreated, dto)
}

// UpdateSubscription godoc
//
// @Summary      Update an existing subscription (including cancellation)
// @Description  Full replacement update. Set status="cancelled" to soft-delete.
// @Tags         subscriptions
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path      string                         true  "subscription id (UUID)"
// @Param        body  body      api.UpdateSubscriptionRequest  true  "subscription"
// @Success      200   {object}  httpx.Response{data=api.SubscriptionDTO}
// @Failure      400   {object}  httpx.Response
// @Failure      401   {object}  httpx.Response
// @Failure      404   {object}  httpx.Response
// @Failure      500   {object}  httpx.Response
// @Router       /subscriptions/{id} [put]
func (h *Handler) UpdateSubscription(w http.ResponseWriter, r *http.Request) {
	userID := auth.MustUserID(r.Context())

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpx.BadRequest(w, "id must be a UUID")
		return
	}

	var req UpdateSubscriptionRequest
	if err := decodeJSON(r, &req); err != nil {
		httpx.BadRequest(w, err.Error())
		return
	}

	common, err := validateCommon(
		req.ServiceName, req.Price, req.Currency, req.BillingCycle, req.NextBillingDate, h.conv,
	)
	if err != nil {
		httpx.BadRequest(w, err.Error())
		return
	}

	if err := validateOptionalFields(req.PlanName, req.Category, req.Notes); err != nil {
		httpx.BadRequest(w, err.Error())
		return
	}

	if err := validateTrialEndDate(req.TrialEndDate); err != nil {
		httpx.BadRequest(w, err.Error())
		return
	}

	status, err := validateStatus(req.Status)
	if err != nil {
		httpx.BadRequest(w, err.Error())
		return
	}

	nextDate, _ := parseDate(common.NextBillingDate)

	params := repository.UpdateUserSubscriptionParams{
		ID:              id,
		UserID:          userID,
		ServiceName:     common.ServiceName,
		PlanName:        pgTextFromPtr(req.PlanName),
		Price:           common.Price,
		Currency:        common.Currency,
		BillingCycle:    common.BillingCycle,
		NextBillingDate: nextDate,
		TrialEndDate:    pgDateFromPtr(req.TrialEndDate),
		Category:        pgTextFromPtr(req.Category),
		PaymentMethod:   pgTextFromPtr(req.PaymentMethod),
		Notes:           pgTextFromPtr(req.Notes),
		Status:          status,
	}

	row, err := h.repo.UpdateUserSubscription(r.Context(), params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.NotFound(w, "subscription not found")
			return
		}
		httpx.Internal(w, err)
		return
	}

	dto, err := toSubscriptionDTO(row, h.conv)
	if err != nil {
		httpx.Internal(w, err)
		return
	}

	httpx.OK(w, http.StatusOK, dto)
}

// DeleteSubscription godoc
//
// @Summary      Permanently delete a subscription
// @Tags         subscriptions
// @Security     BearerAuth
// @Param        id   path      string  true  "subscription id (UUID)"
// @Success      204  {object}  httpx.Response
// @Failure      400  {object}  httpx.Response
// @Failure      401  {object}  httpx.Response
// @Failure      500  {object}  httpx.Response
// @Router       /subscriptions/{id} [delete]
func (h *Handler) DeleteSubscription(w http.ResponseWriter, r *http.Request) {
	userID := auth.MustUserID(r.Context())

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httpx.BadRequest(w, "id must be a UUID")
		return
	}

	if err := h.repo.DeleteUserSubscription(r.Context(), repository.DeleteUserSubscriptionParams{
		ID: id, UserID: userID,
	}); err != nil {
		httpx.Internal(w, err)
		return
	}

	httpx.OK(w, http.StatusNoContent, nil)
}

// decodeJSON decodes the request body with strict field checking so typos in
// the JSON body surface as 400 rather than silently being ignored.
func decodeJSON(r *http.Request, dst any) error {
	if r.Body == nil {
		return errors.New("request body is empty")
	}
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	return nil
}

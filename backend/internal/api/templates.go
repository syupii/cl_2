package api

import (
	"net/http"

	"github.com/syupii/cl_2/backend/internal/httpx"
	"github.com/syupii/cl_2/backend/internal/repository"
)

// ListTemplates godoc
//
// @Summary      List subscription templates
// @Description  Returns all pre-defined service templates (Netflix, Spotify,
// @Description  etc.) with their plans nested inside. Consumed by the
// @Description  "register from template" modal on the frontend.
// @Tags         templates
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  httpx.Response{data=api.ListTemplatesResponse}
// @Failure      401  {object}  httpx.Response
// @Failure      500  {object}  httpx.Response
// @Router       /templates [get]
func (h *Handler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	templates, err := h.repo.ListServiceTemplates(ctx)
	if err != nil {
		httpx.Internal(w, err)
		return
	}

	plans, err := h.repo.ListAllServicePlans(ctx)
	if err != nil {
		httpx.Internal(w, err)
		return
	}

	// Index plans by their parent template id once, so the mapper is O(n).
	plansByTemplate := make(map[string][]repository.ServicePlan, len(templates))
	for _, p := range plans {
		id := p.TemplateID.String()
		plansByTemplate[id] = append(plansByTemplate[id], p)
	}

	httpx.OK(w, http.StatusOK, ListTemplatesResponse{
		Templates: toTemplateDTOs(templates, plansByTemplate),
	})
}

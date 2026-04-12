package api

import (
	"github.com/syupii/cl_2/backend/internal/money"
	"github.com/syupii/cl_2/backend/internal/repository"
)

// Handler wires the HTTP layer to the sqlc-generated repository and the
// money converter. Construct it once in main and pass the receiver methods
// to the chi router.
type Handler struct {
	repo       repository.Querier
	conv       *money.Converter
	adminEmail string // lowercase email; empty = admin routes disabled
}

// NewHandler builds a Handler. Both dependencies are required.
func NewHandler(repo repository.Querier, conv *money.Converter, adminEmail string) *Handler {
	return &Handler{repo: repo, conv: conv, adminEmail: adminEmail}
}

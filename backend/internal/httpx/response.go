// Package httpx centralises the JSON envelope mandated by RULES.md section 2:
//
//	{ "success": true/false, "data": { ... }, "error": "エラーメッセージ" }
//
// Every HTTP handler in the project must write responses through this package
// so client code can rely on a consistent shape.
package httpx

import (
	"encoding/json"
	"log"
	"net/http"
)

// Response is the uniform envelope used by every API endpoint.
// It is intentionally generic (Data is any) so swag can still document the
// concrete data type with the "httpx.Response{data=foo.Bar}" extension.
type Response struct {
	Success bool   `json:"success" example:"true"`
	Data    any    `json:"data,omitempty"`
	Error   string `json:"error" example:""`
}

// OK writes a 2xx JSON response with the given payload.
func OK(w http.ResponseWriter, status int, data any) {
	write(w, status, Response{Success: true, Data: data, Error: ""})
}

// Error writes a non-2xx JSON response with a message.
// Data is always nil for error responses so the client never has to guess.
func Error(w http.ResponseWriter, status int, msg string) {
	write(w, status, Response{Success: false, Data: nil, Error: msg})
}

// BadRequest is a shorthand for 400.
func BadRequest(w http.ResponseWriter, msg string) {
	Error(w, http.StatusBadRequest, msg)
}

// Unauthorized is a shorthand for 401.
func Unauthorized(w http.ResponseWriter, msg string) {
	Error(w, http.StatusUnauthorized, msg)
}

// NotFound is a shorthand for 404.
func NotFound(w http.ResponseWriter, msg string) {
	Error(w, http.StatusNotFound, msg)
}

// Internal is a shorthand for 500. It logs the underlying error but only
// surfaces a generic message to the client to avoid leaking DB internals.
func Internal(w http.ResponseWriter, err error) {
	if err != nil {
		log.Printf("httpx: internal error: %v", err)
	}
	Error(w, http.StatusInternalServerError, "internal server error")
}

func write(w http.ResponseWriter, status int, body Response) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		// We already wrote headers; just log and continue.
		log.Printf("httpx: encoding response failed: %v", err)
	}
}

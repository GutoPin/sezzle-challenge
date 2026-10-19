package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
)

const maxBodyBytes = 1 << 10

type errorBody struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	// The status line is already sent, so an encoding error can only mean
	// the client went away; there is nothing useful left to do with it.
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, e apiError) {
	writeJSON(w, e.status, errorBody{errorDetail{e.code, e.message}})
}

// decodeJSON reads exactly one JSON value into dst, rejecting unknown fields,
// trailing data and bodies larger than maxBodyBytes.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return fmt.Errorf("decode request body: %w", err)
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("trailing data after JSON body")
	}
	return nil
}

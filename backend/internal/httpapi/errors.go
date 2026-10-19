package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/gutopin/quotient/backend/internal/calculator"
)

// apiError is an error as clients see it: an HTTP status plus a stable code
// the frontend can translate. Messages are hints for humans, not contracts.
type apiError struct {
	status  int
	code    string
	message string
}

var (
	errNotFound         = apiError{http.StatusNotFound, "not_found", "no route matches this path"}
	errMethodNotAllowed = apiError{http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed on this path"}
	errInternal         = apiError{http.StatusInternalServerError, "internal_error", "internal server error"}
)

// fromDomain maps calculator errors to their HTTP representation. Anything
// unrecognized becomes a 500 so internal details never leak to clients.
func fromDomain(err error) apiError {
	var status int
	var code string
	switch {
	case errors.Is(err, calculator.ErrUnknownOperation):
		status, code = http.StatusNotFound, "unknown_operation"
	case errors.Is(err, calculator.ErrOperandCount):
		status, code = http.StatusBadRequest, "invalid_operand_count"
	case errors.Is(err, calculator.ErrInvalidOperand):
		status, code = http.StatusBadRequest, "invalid_operand"
	case errors.Is(err, calculator.ErrDivisionByZero):
		status, code = http.StatusUnprocessableEntity, "division_by_zero"
	case errors.Is(err, calculator.ErrNegativeSquareRoot):
		status, code = http.StatusUnprocessableEntity, "negative_square_root"
	case errors.Is(err, calculator.ErrUndefinedResult):
		status, code = http.StatusUnprocessableEntity, "undefined_result"
	case errors.Is(err, calculator.ErrResultOutOfRange):
		status, code = http.StatusUnprocessableEntity, "result_out_of_range"
	default:
		return errInternal
	}
	return apiError{status, code, err.Error()}
}

// fromDecode maps request body decoding failures to client errors.
func fromDecode(err error) apiError {
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		return apiError{http.StatusRequestEntityTooLarge, "payload_too_large", "request body must not exceed 1 KiB"}
	}
	if errors.Is(err, io.EOF) {
		return apiError{http.StatusBadRequest, "invalid_json", "request body is empty"}
	}
	// encoding/json has no typed error for unknown fields.
	if _, field, ok := strings.Cut(err.Error(), "json: unknown field "); ok {
		return apiError{http.StatusBadRequest, "unknown_field", "unknown field " + field}
	}

	var typeErr *json.UnmarshalTypeError
	if errors.As(err, &typeErr) {
		return apiError{http.StatusBadRequest, "invalid_json", "operands must be an array of numbers"}
	}
	return apiError{http.StatusBadRequest, "invalid_json", "request body is not valid JSON"}
}

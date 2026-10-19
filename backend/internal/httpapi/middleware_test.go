package httpapi

import (
	"bytes"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/gutopin/quotient/backend/internal/calculator"
)

func TestRecoverPanics(t *testing.T) {
	t.Parallel()

	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	h := recoverPanics(logger)(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	}))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	var body errorBody
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil || body.Error.Code != "internal_error" {
		t.Errorf("body = %+v (decode err %v), want internal_error", body, err)
	}
	if !strings.Contains(logs.String(), "boom") || !strings.Contains(logs.String(), "stack=") {
		t.Errorf("panic was not logged with a stack trace: %s", logs.String())
	}
}

func TestRecoverPanicsRethrowsAbort(t *testing.T) {
	t.Parallel()

	h := recoverPanics(slog.New(slog.DiscardHandler))(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic(http.ErrAbortHandler)
	}))

	defer func() {
		if v := recover(); v != http.ErrAbortHandler { //nolint:errorlint // comparing the recovered value itself
			t.Errorf("recovered %v, want http.ErrAbortHandler", v)
		}
	}()
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", nil))
}

func TestLogRequests(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		path      string
		status    int
		wantLevel string
	}{
		{"success logs at info", "/api/v1/operations", http.StatusOK, "level=INFO"},
		{"server error logs at error", "/api/v1/operations", http.StatusInternalServerError, "level=ERROR"},
		{"health probe logs at debug", "/api/v1/health", http.StatusOK, "level=DEBUG"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			var logs bytes.Buffer
			logger := slog.New(slog.NewTextHandler(&logs, &slog.HandlerOptions{Level: slog.LevelDebug}))
			h := chain(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(tc.status)
				_, _ = w.Write([]byte("hello"))
			}), withRequestID, logRequests(logger))

			h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequestWithContext(t.Context(), http.MethodGet, tc.path, nil))

			line := logs.String()
			for _, want := range []string{tc.wantLevel, "status=" + strconv.Itoa(tc.status), "bytes=5", "request_id=", "path=" + tc.path} {
				if !strings.Contains(line, want) {
					t.Errorf("log line %q does not contain %q", line, want)
				}
			}
		})
	}
}

type failingCalculator struct{}

func (failingCalculator) Calculate(calculator.Operation, []float64) (float64, error) {
	return 0, errors.New("database exploded")
}

func (failingCalculator) Operations() []calculator.Descriptor { return nil }

func TestUnexpectedDomainErrorIsHidden(t *testing.T) {
	t.Parallel()

	h := NewRouter(failingCalculator{}, Options{})
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/api/v1/operations/add", strings.NewReader(`{"operands":[1,2]}`))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "database") {
		t.Errorf("internal error leaked to the client: %s", rec.Body)
	}
}

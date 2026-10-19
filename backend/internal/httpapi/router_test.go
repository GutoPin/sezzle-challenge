package httpapi_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gutopin/quotient/backend/internal/calculator"
	"github.com/gutopin/quotient/backend/internal/httpapi"
)

type errorEnvelope struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func newRouter(t *testing.T, opts httpapi.Options) http.Handler {
	t.Helper()
	return httpapi.NewRouter(calculator.Calculator{}, opts)
}

func do(t *testing.T, h http.Handler, method, target, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), method, target, strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestHealth(t *testing.T) {
	t.Parallel()

	rec := do(t, newRouter(t, httpapi.Options{}), http.MethodGet, "/api/v1/health", "")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if got := strings.TrimSpace(rec.Body.String()); got != `{"status":"ok"}` {
		t.Errorf("body = %s", got)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
}

func TestListOperations(t *testing.T) {
	t.Parallel()

	rec := do(t, newRouter(t, httpapi.Options{}), http.MethodGet, "/api/v1/operations", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}

	var body struct {
		Operations []struct {
			Name   string `json:"name"`
			Symbol string `json:"symbol"`
			Arity  int    `json:"arity"`
		} `json:"operations"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if len(body.Operations) != 7 {
		t.Fatalf("got %d operations, want 7", len(body.Operations))
	}
	if first := body.Operations[0]; first.Name != "add" || first.Symbol != "+" || first.Arity != 2 {
		t.Errorf("first operation = %+v, want add/+/2", first)
	}
}

func TestCalculateSuccess(t *testing.T) {
	t.Parallel()

	tests := []struct {
		operation string
		body      string
		want      string
	}{
		{"add", `{"operands":[2,3]}`, `{"operation":"add","operands":[2,3],"result":5}`},
		{"subtract", `{"operands":[0.3,0.1]}`, `{"operation":"subtract","operands":[0.3,0.1],"result":0.2}`},
		{"multiply", `{"operands":[-4,2.5]}`, `{"operation":"multiply","operands":[-4,2.5],"result":-10}`},
		{"divide", `{"operands":[10,4]}`, `{"operation":"divide","operands":[10,4],"result":2.5}`},
		{"power", `{"operands":[2,10]}`, `{"operation":"power","operands":[2,10],"result":1024}`},
		{"sqrt", `{"operands":[16]}`, `{"operation":"sqrt","operands":[16],"result":4}`},
		{"percentage", `{"operands":[15,200]}`, `{"operation":"percentage","operands":[15,200],"result":30}`},
	}

	h := newRouter(t, httpapi.Options{})
	for _, tc := range tests {
		t.Run(tc.operation, func(t *testing.T) {
			t.Parallel()

			rec := do(t, h, http.MethodPost, "/api/v1/operations/"+tc.operation, tc.body)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
			}
			if got := strings.TrimSpace(rec.Body.String()); got != tc.want {
				t.Errorf("body = %s, want %s", got, tc.want)
			}
		})
	}
}

func TestCalculateErrors(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		method     string
		target     string
		body       string
		wantStatus int
		wantCode   string
	}{
		{"empty body", http.MethodPost, "/api/v1/operations/add", "", 400, "invalid_json"},
		{"malformed JSON", http.MethodPost, "/api/v1/operations/add", `{"operands":[1,`, 400, "invalid_json"},
		{"operands not numbers", http.MethodPost, "/api/v1/operations/add", `{"operands":["1","2"]}`, 400, "invalid_json"},
		{"number out of float range", http.MethodPost, "/api/v1/operations/add", `{"operands":[1e400,1]}`, 400, "invalid_json"},
		{"trailing data", http.MethodPost, "/api/v1/operations/add", `{"operands":[1,2]} {}`, 400, "invalid_json"},
		{"unknown field", http.MethodPost, "/api/v1/operations/add", `{"operands":[1,2],"extra":true}`, 400, "unknown_field"},
		{"missing operands", http.MethodPost, "/api/v1/operations/add", `{}`, 400, "invalid_operand_count"},
		{"null operands", http.MethodPost, "/api/v1/operations/add", `{"operands":null}`, 400, "invalid_operand_count"},
		{"null operand", http.MethodPost, "/api/v1/operations/add", `{"operands":[null,2]}`, 400, "invalid_operand"},
		{"NaN literal", http.MethodPost, "/api/v1/operations/add", `{"operands":[NaN,1]}`, 400, "invalid_json"},
		{"boolean operand", http.MethodPost, "/api/v1/operations/add", `{"operands":[true,1]}`, 400, "invalid_json"},
		{"nested operand", http.MethodPost, "/api/v1/operations/add", `{"operands":[[1],2]}`, 400, "invalid_json"},
		{"array body", http.MethodPost, "/api/v1/operations/add", `[1,2]`, 400, "invalid_json"},
		{"whitespace body", http.MethodPost, "/api/v1/operations/add", "  \n ", 400, "invalid_json"},
		{"too many operands", http.MethodPost, "/api/v1/operations/sqrt", `{"operands":[4,2]}`, 400, "invalid_operand_count"},
		{"unknown operation", http.MethodPost, "/api/v1/operations/modulo", `{"operands":[1,2]}`, 404, "unknown_operation"},
		{"wrong method", http.MethodGet, "/api/v1/operations/add", "", 405, "method_not_allowed"},
		{"payload too large", http.MethodPost, "/api/v1/operations/add", `{"operands":[` + strings.Repeat("1,", 600) + `1]}`, 413, "payload_too_large"},
		{"division by zero", http.MethodPost, "/api/v1/operations/divide", `{"operands":[1,0]}`, 422, "division_by_zero"},
		{"negative square root", http.MethodPost, "/api/v1/operations/sqrt", `{"operands":[-1]}`, 422, "negative_square_root"},
		{"undefined result", http.MethodPost, "/api/v1/operations/power", `{"operands":[-8,0.5]}`, 422, "undefined_result"},
		{"result out of range", http.MethodPost, "/api/v1/operations/multiply", `{"operands":[1e308,10]}`, 422, "result_out_of_range"},
		{"divisor underflows to zero", http.MethodPost, "/api/v1/operations/divide", `{"operands":[1,1e-400]}`, 422, "division_by_zero"},
		{"division by a subnormal overflows", http.MethodPost, "/api/v1/operations/divide", `{"operands":[1,5e-324]}`, 422, "result_out_of_range"},
		{"cube root of a negative", http.MethodPost, "/api/v1/operations/power", `{"operands":[-8,0.3333333333333333]}`, 422, "undefined_result"},
		{"operation names are case-sensitive", http.MethodPost, "/api/v1/operations/ADD", `{"operands":[1,2]}`, 404, "unknown_operation"},
		{"unknown API path", http.MethodGet, "/api/v2/anything", "", 404, "not_found"},
		{"unknown path without frontend", http.MethodGet, "/", "", 404, "not_found"},
	}

	h := newRouter(t, httpapi.Options{})
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			rec := do(t, h, tc.method, tc.target, tc.body)
			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d; body: %s", rec.Code, tc.wantStatus, rec.Body)
			}

			var env errorEnvelope
			if err := json.NewDecoder(rec.Body).Decode(&env); err != nil {
				t.Fatalf("decode error body: %v", err)
			}
			if env.Error.Code != tc.wantCode {
				t.Errorf("code = %q, want %q", env.Error.Code, tc.wantCode)
			}
			if env.Error.Message == "" {
				t.Error("error message is empty")
			}
		})
	}
}

func TestMethodNotAllowedListsAllowedMethods(t *testing.T) {
	t.Parallel()

	h := newRouter(t, httpapi.Options{})
	if got := do(t, h, http.MethodPut, "/api/v1/operations/add", "").Header().Get("Allow"); got != "POST" {
		t.Errorf("Allow = %q, want POST", got)
	}
	if got := do(t, h, http.MethodPost, "/api/v1/health", "").Header().Get("Allow"); got != "GET, HEAD" {
		t.Errorf("Allow = %q, want GET, HEAD", got)
	}
}

func TestDocs(t *testing.T) {
	t.Parallel()

	h := newRouter(t, httpapi.Options{})

	spec := do(t, h, http.MethodGet, "/api/openapi.yaml", "")
	if spec.Code != http.StatusOK || !strings.HasPrefix(spec.Body.String(), "openapi: 3.1") {
		t.Errorf("GET /api/openapi.yaml = %d, body starts %.20q", spec.Code, spec.Body.String())
	}
	if ct := spec.Header().Get("Content-Type"); ct != "application/yaml" {
		t.Errorf("spec Content-Type = %q", ct)
	}

	page := do(t, h, http.MethodGet, "/docs", "")
	if page.Code != http.StatusOK || !strings.Contains(page.Body.String(), "/api/openapi.yaml") {
		t.Errorf("GET /docs = %d, page does not reference the spec", page.Code)
	}
}

func TestSecurityHeaders(t *testing.T) {
	t.Parallel()

	rec := do(t, newRouter(t, httpapi.Options{}), http.MethodGet, "/api/v1/health", "")

	want := map[string]string{
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options":        "DENY",
		"Cache-Control":          "no-store",
	}
	for header, value := range want {
		if got := rec.Header().Get(header); got != value {
			t.Errorf("%s = %q, want %q", header, got, value)
		}
	}
	if rec.Header().Get("X-Request-ID") == "" {
		t.Error("X-Request-ID header is missing")
	}
}

func TestRequestIDPropagation(t *testing.T) {
	t.Parallel()

	h := newRouter(t, httpapi.Options{})
	tests := []struct {
		name     string
		incoming string
		keep     bool
	}{
		{"safe ID is echoed", "trace-123_abc.9", true},
		{"unsafe ID is replaced", "bad id\n", false},
		{"overlong ID is replaced", strings.Repeat("a", 65), false},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/v1/health", nil)
			req.Header.Set("X-Request-ID", tc.incoming)
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)

			got := rec.Header().Get("X-Request-ID")
			if tc.keep && got != tc.incoming {
				t.Errorf("X-Request-ID = %q, want %q", got, tc.incoming)
			}
			if !tc.keep && (got == tc.incoming || got == "") {
				t.Errorf("X-Request-ID = %q, want a freshly generated ID", got)
			}
		})
	}
}

func TestCORS(t *testing.T) {
	t.Parallel()

	const allowed = "http://localhost:5173"
	h := newRouter(t, httpapi.Options{AllowedOrigins: []string{allowed}})

	t.Run("preflight from allowed origin", func(t *testing.T) {
		t.Parallel()

		req := httptest.NewRequestWithContext(t.Context(), http.MethodOptions, "/api/v1/operations/add", nil)
		req.Header.Set("Origin", allowed)
		req.Header.Set("Access-Control-Request-Method", http.MethodPost)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204", rec.Code)
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != allowed {
			t.Errorf("Allow-Origin = %q, want %q", got, allowed)
		}
		if got := rec.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(got, "POST") {
			t.Errorf("Allow-Methods = %q, want it to include POST", got)
		}
	})

	t.Run("simple request from allowed origin", func(t *testing.T) {
		t.Parallel()

		req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/v1/health", nil)
		req.Header.Set("Origin", allowed)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK || rec.Header().Get("Access-Control-Allow-Origin") != allowed {
			t.Errorf("status = %d, Allow-Origin = %q", rec.Code, rec.Header().Get("Access-Control-Allow-Origin"))
		}
	})

	t.Run("other origins get no CORS headers", func(t *testing.T) {
		t.Parallel()

		req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/v1/health", nil)
		req.Header.Set("Origin", "https://evil.example")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("Allow-Origin = %q, want none", got)
		}
	})
}

func TestStaticFrontend(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, "index.html"), "<html>app</html>")
	writeFile(t, filepath.Join(dir, "assets", "app.123.js"), "console.log(1)")
	h := newRouter(t, httpapi.Options{StaticDir: dir})

	tests := []struct {
		name       string
		method     string
		target     string
		wantStatus int
		wantBody   string
		wantCache  string
	}{
		{"root serves index", http.MethodGet, "/", 200, "<html>app</html>", "no-cache"},
		{"client route falls back to index", http.MethodGet, "/history/42", 200, "<html>app</html>", "no-cache"},
		{"fingerprinted asset is cached", http.MethodGet, "/assets/app.123.js", 200, "console.log(1)", "public, max-age=31536000, immutable"},
		{"directory falls back to index", http.MethodGet, "/assets", 200, "<html>app</html>", "no-cache"},
		{"API still wins over the frontend", http.MethodGet, "/api/v1/health", 200, `{"status":"ok"}`, "no-store"},
		{"unknown API path is not the SPA", http.MethodGet, "/api/nope", 404, "not_found", "no-store"},
		{"writes are rejected", http.MethodPost, "/", 405, "method_not_allowed", ""},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			rec := do(t, h, tc.method, tc.target, "")
			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tc.wantStatus)
			}
			if !strings.Contains(rec.Body.String(), tc.wantBody) {
				t.Errorf("body = %q, want it to contain %q", rec.Body, tc.wantBody)
			}
			if got := rec.Header().Get("Cache-Control"); got != tc.wantCache {
				t.Errorf("Cache-Control = %q, want %q", got, tc.wantCache)
			}
		})
	}
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
}

// Package httpapi exposes the calculator over HTTP. It owns routing, JSON
// encoding, error mapping and cross-cutting middleware, and nothing else.
package httpapi

import (
	"log/slog"
	"net/http"
)

// Options configures the router.
type Options struct {
	Logger *slog.Logger
	// AllowedOrigins enables CORS for these origins. Leave empty when the
	// frontend is served from the same origin.
	AllowedOrigins []string
	// StaticDir, when set, serves a built frontend at "/".
	StaticDir string
}

// NewRouter returns the fully wired HTTP handler for the service.
func NewRouter(calc Calculator, opts Options) http.Handler {
	logger := opts.Logger
	if logger == nil {
		logger = slog.New(slog.DiscardHandler)
	}

	h := handlers{calc: calc}
	mux := http.NewServeMux()
	route(mux, http.MethodGet, "/api/v1/health", h.health)
	route(mux, http.MethodGet, "/api/v1/operations", h.listOperations)
	route(mux, http.MethodPost, "/api/v1/operations/{operation}", h.calculate)
	route(mux, http.MethodGet, "/api/openapi.yaml", serveSpec)
	route(mux, http.MethodGet, "/docs", serveDocs)
	mux.HandleFunc("/api/", notFound)

	if opts.StaticDir != "" {
		mux.Handle("/", spaHandler(opts.StaticDir))
	} else {
		mux.HandleFunc("/", notFound)
	}

	return chain(mux,
		withRequestID,
		logRequests(logger),
		recoverPanics(logger),
		securityHeaders,
		cors(opts.AllowedOrigins),
	)
}

// route registers fn for method on pattern, and answers every other method on
// the same path with a JSON 405 instead of the mux's plain-text default.
func route(mux *http.ServeMux, method, pattern string, fn http.HandlerFunc) {
	allow := method
	if method == http.MethodGet {
		allow = "GET, HEAD"
	}

	mux.HandleFunc(method+" "+pattern, fn)
	mux.HandleFunc(pattern, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Allow", allow)
		writeError(w, errMethodNotAllowed)
	})
}

func notFound(w http.ResponseWriter, _ *http.Request) {
	writeError(w, errNotFound)
}

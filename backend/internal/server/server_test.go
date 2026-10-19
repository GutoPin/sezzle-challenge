package server_test

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"testing"
	"time"

	"github.com/gutopin/quotient/backend/internal/server"
)

func TestServeShutsDownGracefully(t *testing.T) {
	t.Parallel()

	ln := listen(t)

	ctx, cancel := context.WithCancel(t.Context())
	done := make(chan error, 1)
	handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	})
	go func() { done <- server.Serve(ctx, ln, handler, slog.New(slog.DiscardHandler)) }()

	req, err := http.NewRequestWithContext(t.Context(), http.MethodGet, "http://"+ln.Addr().String(), http.NoBody)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request to running server failed: %v", err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusTeapot {
		t.Errorf("status = %d, want 418", resp.StatusCode)
	}

	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Errorf("Serve() returned %v after shutdown, want nil", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Serve() did not return after the context was cancelled")
	}
}

func TestServeReportsListenerFailure(t *testing.T) {
	t.Parallel()

	ln := listen(t)
	_ = ln.Close()

	err := server.Serve(t.Context(), ln, http.NotFoundHandler(), slog.New(slog.DiscardHandler))
	if err == nil {
		t.Fatal("Serve() on a closed listener returned nil, want an error")
	}
}

func listen(t *testing.T) net.Listener {
	t.Helper()
	var lc net.ListenConfig
	ln, err := lc.Listen(t.Context(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	return ln
}

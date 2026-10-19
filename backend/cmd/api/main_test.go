package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/gutopin/quotient/backend/internal/config"
)

func env(vars map[string]string) func(string) string {
	return func(key string) string { return vars[key] }
}

// freePort returns a port that was free a moment ago.
func freePort(t *testing.T) int {
	t.Helper()
	var lc net.ListenConfig
	ln, err := lc.Listen(t.Context(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	return ln.Addr().(*net.TCPAddr).Port
}

func serverPort(t *testing.T, h http.Handler) string {
	t.Helper()
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	return strconv.Itoa(srv.Listener.Addr().(*net.TCPAddr).Port)
}

func TestRunServesUntilCancelled(t *testing.T) {
	t.Parallel()

	port := freePort(t)
	ctx, cancel := context.WithCancel(t.Context())
	var stdout bytes.Buffer
	done := make(chan int, 1)
	go func() {
		done <- run(ctx, nil, env(map[string]string{"PORT": strconv.Itoa(port)}), &stdout, io.Discard)
	}()

	// The healthcheck subcommand doubles as a readiness probe here.
	probe := env(map[string]string{"PORT": strconv.Itoa(port)})
	deadline := time.Now().Add(5 * time.Second)
	for run(t.Context(), []string{"healthcheck"}, probe, io.Discard, io.Discard) != 0 {
		if time.Now().After(deadline) {
			t.Fatal("server never became healthy")
		}
		time.Sleep(20 * time.Millisecond)
	}

	cancel()
	if code := <-done; code != 0 {
		t.Errorf("run exited with %d after shutdown, want 0", code)
	}
	if !strings.Contains(stdout.String(), "listening") {
		t.Errorf("startup was not logged: %s", stdout.String())
	}
}

func TestRunRejectsInvalidConfig(t *testing.T) {
	t.Parallel()

	var stderr bytes.Buffer
	code := run(t.Context(), nil, env(map[string]string{"PORT": "nope"}), io.Discard, &stderr)

	if code != 2 {
		t.Errorf("exit code = %d, want 2", code)
	}
	if !strings.Contains(stderr.String(), "PORT") {
		t.Errorf("stderr does not explain the problem: %q", stderr.String())
	}
}

func TestRunReportsListenFailure(t *testing.T) {
	t.Parallel()

	var lc net.ListenConfig
	busy, err := lc.Listen(t.Context(), "tcp", ":0")
	if err != nil {
		t.Fatal(err)
	}
	defer busy.Close()
	port := strconv.Itoa(busy.Addr().(*net.TCPAddr).Port)

	var stdout bytes.Buffer
	if code := run(t.Context(), nil, env(map[string]string{"PORT": port}), &stdout, io.Discard); code != 1 {
		t.Errorf("exit code = %d, want 1", code)
	}
	if !strings.Contains(stdout.String(), "listen") {
		t.Errorf("listen failure was not logged: %s", stdout.String())
	}
}

func TestHealthcheckSubcommand(t *testing.T) {
	t.Parallel()

	healthy := serverPort(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/health" {
			http.NotFound(w, r)
		}
	}))
	failing := serverPort(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))

	tests := []struct {
		name string
		port string
		want int
	}{
		{"healthy", healthy, 0},
		{"unhealthy", failing, 1},
		{"unreachable", strconv.Itoa(freePort(t)), 1},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got := run(t.Context(), []string{"healthcheck"}, env(map[string]string{"PORT": tc.port}), io.Discard, io.Discard)
			if got != tc.want {
				t.Errorf("exit code = %d, want %d", got, tc.want)
			}
		})
	}
}

func TestNewLogger(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		cfg  config.Config
		want string
	}{
		{"text", config.Config{LogLevel: slog.LevelInfo}, "*slog.TextHandler"},
		{"json", config.Config{LogLevel: slog.LevelInfo, LogJSON: true}, "*slog.JSONHandler"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			if got := fmt.Sprintf("%T", newLogger(tc.cfg, io.Discard).Handler()); got != tc.want {
				t.Errorf("handler = %s, want %s", got, tc.want)
			}
		})
	}

	logger := newLogger(config.Config{LogLevel: slog.LevelWarn}, io.Discard)
	if logger.Enabled(t.Context(), slog.LevelInfo) || !logger.Enabled(t.Context(), slog.LevelWarn) {
		t.Error("logger does not respect the configured level")
	}
}

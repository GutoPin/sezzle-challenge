// Command api runs the Quotient calculator service.
//
// Run "api healthcheck" to probe a running instance; the Docker image uses it
// because the distroless base has no shell or curl.
package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/gutopin/quotient/backend/internal/calculator"
	"github.com/gutopin/quotient/backend/internal/config"
	"github.com/gutopin/quotient/backend/internal/httpapi"
	"github.com/gutopin/quotient/backend/internal/server"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	code := run(ctx, os.Args[1:], os.Getenv, os.Stdout, os.Stderr)
	stop()
	os.Exit(code)
}

// run is main with its dependencies passed in, so it can be tested. It
// returns the process exit code.
func run(ctx context.Context, args []string, getenv func(string) string, stdout, stderr io.Writer) int {
	cfg, err := config.Load(getenv)
	if err != nil {
		_, _ = fmt.Fprintf(stderr, "invalid configuration:\n%v\n", err)
		return 2
	}

	if len(args) > 0 && args[0] == "healthcheck" {
		if err := healthcheck(ctx, cfg.Port); err != nil {
			_, _ = fmt.Fprintln(stderr, err)
			return 1
		}
		return 0
	}

	logger := newLogger(cfg, stdout)
	if err := serve(ctx, cfg, logger); err != nil {
		logger.Error("server stopped", slog.Any("error", err))
		return 1
	}
	return 0
}

func serve(ctx context.Context, cfg config.Config, logger *slog.Logger) error {
	router := httpapi.NewRouter(calculator.Calculator{}, httpapi.Options{
		Logger:         logger,
		AllowedOrigins: cfg.AllowedOrigins,
		StaticDir:      cfg.StaticDir,
	})

	var lc net.ListenConfig
	ln, err := lc.Listen(ctx, "tcp", ":"+strconv.Itoa(cfg.Port))
	if err != nil {
		return fmt.Errorf("listen: %w", err)
	}

	logger.Info("listening",
		slog.String("addr", ln.Addr().String()),
		slog.Any("allowed_origins", cfg.AllowedOrigins),
		slog.String("static_dir", cfg.StaticDir),
	)
	return server.Serve(ctx, ln, router, logger) //nolint:wrapcheck // already wrapped with context
}

func newLogger(cfg config.Config, w io.Writer) *slog.Logger {
	opts := &slog.HandlerOptions{Level: cfg.LogLevel}
	if cfg.LogJSON {
		return slog.New(slog.NewJSONHandler(w, opts))
	}
	return slog.New(slog.NewTextHandler(w, opts))
}

func healthcheck(ctx context.Context, port int) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	url := fmt.Sprintf("http://127.0.0.1:%d/api/v1/health", port)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, http.NoBody)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("healthcheck: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return errors.New("healthcheck: unexpected status " + resp.Status)
	}
	return nil
}

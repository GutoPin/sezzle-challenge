// Command api runs the Quotient calculator service.
//
// Run "api healthcheck" to probe a running instance; the Docker image uses it
// because the distroless base has no shell or curl.
package main

import (
	"context"
	"errors"
	"fmt"
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
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid configuration:\n%v\n", err)
		os.Exit(2)
	}

	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		if err := healthcheck(cfg.Port); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}

	logger := newLogger(cfg)
	if err := run(cfg, logger); err != nil {
		logger.Error("server stopped", slog.Any("error", err))
		os.Exit(1)
	}
}

func run(cfg config.Config, logger *slog.Logger) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

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

func newLogger(cfg config.Config) *slog.Logger {
	opts := &slog.HandlerOptions{Level: cfg.LogLevel}
	if cfg.LogJSON {
		return slog.New(slog.NewJSONHandler(os.Stdout, opts))
	}
	return slog.New(slog.NewTextHandler(os.Stdout, opts))
}

func healthcheck(port int) error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
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

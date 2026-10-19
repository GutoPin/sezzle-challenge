// Package config loads runtime settings from environment variables.
package config

import (
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
)

// Config holds everything the service needs at startup.
type Config struct {
	// Port is the TCP port the HTTP server listens on.
	Port int
	// AllowedOrigins lists the browser origins allowed to call the API
	// cross-origin. Empty means same-origin only, which is the Docker setup.
	AllowedOrigins []string
	// StaticDir, when set, is a built frontend served alongside the API.
	StaticDir string
	LogLevel  slog.Level
	LogJSON   bool
}

// Load reads the configuration through getenv, which is os.Getenv in
// production and a map lookup in tests.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{Port: 8080, LogLevel: slog.LevelInfo}
	var errs []error

	if v := getenv("PORT"); v != "" {
		port, err := strconv.Atoi(v)
		if err != nil || port < 1 || port > 65535 {
			errs = append(errs, fmt.Errorf("PORT must be between 1 and 65535, got %q", v))
		}
		cfg.Port = port
	}

	for origin := range strings.SplitSeq(getenv("ALLOWED_ORIGINS"), ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			cfg.AllowedOrigins = append(cfg.AllowedOrigins, origin)
		}
	}

	if dir := getenv("STATIC_DIR"); dir != "" {
		info, err := os.Stat(dir)
		if err != nil || !info.IsDir() {
			errs = append(errs, fmt.Errorf("STATIC_DIR %q is not a readable directory", dir))
		}
		cfg.StaticDir = dir
	}

	if v := getenv("LOG_LEVEL"); v != "" {
		if err := cfg.LogLevel.UnmarshalText([]byte(v)); err != nil {
			errs = append(errs, fmt.Errorf("LOG_LEVEL must be debug, info, warn or error, got %q", v))
		}
	}

	switch v := getenv("LOG_FORMAT"); v {
	case "", "text":
	case "json":
		cfg.LogJSON = true
	default:
		errs = append(errs, fmt.Errorf("LOG_FORMAT must be text or json, got %q", v))
	}

	return cfg, errors.Join(errs...)
}

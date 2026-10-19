package config_test

import (
	"log/slog"
	"slices"
	"strings"
	"testing"

	"github.com/gutopin/quotient/backend/internal/config"
)

func env(vars map[string]string) func(string) string {
	return func(key string) string { return vars[key] }
}

func TestLoadDefaults(t *testing.T) {
	t.Parallel()

	cfg, err := config.Load(env(nil))
	if err != nil {
		t.Fatalf("Load() unexpected error: %v", err)
	}
	if cfg.Port != 8080 {
		t.Errorf("Port = %d, want 8080", cfg.Port)
	}
	if cfg.LogLevel != slog.LevelInfo || cfg.LogJSON {
		t.Errorf("logging = (%v, json=%v), want (INFO, json=false)", cfg.LogLevel, cfg.LogJSON)
	}
	if cfg.AllowedOrigins != nil || cfg.StaticDir != "" {
		t.Errorf("expected no origins and no static dir, got %+v", cfg)
	}
}

func TestLoadOverrides(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	cfg, err := config.Load(env(map[string]string{
		"PORT":            "9090",
		"ALLOWED_ORIGINS": " http://localhost:5173, ,https://example.com ",
		"STATIC_DIR":      dir,
		"LOG_LEVEL":       "debug",
		"LOG_FORMAT":      "json",
	}))
	if err != nil {
		t.Fatalf("Load() unexpected error: %v", err)
	}

	wantOrigins := []string{"http://localhost:5173", "https://example.com"}
	if cfg.Port != 9090 {
		t.Errorf("Port = %d, want 9090", cfg.Port)
	}
	if !slices.Equal(cfg.AllowedOrigins, wantOrigins) {
		t.Errorf("AllowedOrigins = %q, want %q", cfg.AllowedOrigins, wantOrigins)
	}
	if cfg.StaticDir != dir {
		t.Errorf("StaticDir = %q, want %q", cfg.StaticDir, dir)
	}
	if cfg.LogLevel != slog.LevelDebug || !cfg.LogJSON {
		t.Errorf("logging = (%v, json=%v), want (DEBUG, json=true)", cfg.LogLevel, cfg.LogJSON)
	}
}

func TestLoadRejectsInvalidValues(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		vars    map[string]string
		wantErr string
	}{
		{"non-numeric port", map[string]string{"PORT": "http"}, "PORT"},
		{"port out of range", map[string]string{"PORT": "70000"}, "PORT"},
		{"missing static dir", map[string]string{"STATIC_DIR": "/does/not/exist"}, "STATIC_DIR"},
		{"unknown log level", map[string]string{"LOG_LEVEL": "loud"}, "LOG_LEVEL"},
		{"unknown log format", map[string]string{"LOG_FORMAT": "xml"}, "LOG_FORMAT"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			_, err := config.Load(env(tc.vars))
			if err == nil || !strings.Contains(err.Error(), tc.wantErr) {
				t.Errorf("Load() error = %v, want it to mention %s", err, tc.wantErr)
			}
		})
	}
}

func TestLoadReportsEveryProblem(t *testing.T) {
	t.Parallel()

	_, err := config.Load(env(map[string]string{"PORT": "0", "LOG_FORMAT": "xml"}))
	if err == nil {
		t.Fatal("Load() succeeded, want an error")
	}
	for _, key := range []string{"PORT", "LOG_FORMAT"} {
		if !strings.Contains(err.Error(), key) {
			t.Errorf("error %q does not mention %s", err, key)
		}
	}
}

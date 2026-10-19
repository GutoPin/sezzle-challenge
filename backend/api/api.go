// Package api embeds the OpenAPI contract so the binary can serve its own docs.
package api

import _ "embed"

// OpenAPISpec is the OpenAPI 3.1 description of the HTTP API.
//
//go:embed openapi.yaml
var OpenAPISpec []byte

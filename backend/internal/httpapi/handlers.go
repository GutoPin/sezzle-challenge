package httpapi

import (
	"net/http"

	"github.com/gutopin/quotient/backend/api"
	"github.com/gutopin/quotient/backend/internal/calculator"
)

// Calculator is the domain behavior the handlers depend on.
type Calculator interface {
	Calculate(op calculator.Operation, operands []float64) (float64, error)
	Operations() []calculator.Descriptor
}

type handlers struct {
	calc Calculator
}

type healthResponse struct {
	Status string `json:"status"`
}

type operationResponse struct {
	Name   calculator.Operation `json:"name"`
	Symbol string               `json:"symbol"`
	Arity  int                  `json:"arity"`
}

type operationsResponse struct {
	Operations []operationResponse `json:"operations"`
}

type calculateRequest struct {
	Operands []float64 `json:"operands"`
}

type calculateResponse struct {
	Operation calculator.Operation `json:"operation"`
	Operands  []float64            `json:"operands"`
	Result    float64              `json:"result"`
}

func (h handlers) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, healthResponse{Status: "ok"})
}

func (h handlers) listOperations(w http.ResponseWriter, _ *http.Request) {
	descriptors := h.calc.Operations()
	resp := operationsResponse{Operations: make([]operationResponse, len(descriptors))}
	for i, d := range descriptors {
		resp.Operations[i] = operationResponse{Name: d.Name, Symbol: d.Symbol, Arity: d.Arity}
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h handlers) calculate(w http.ResponseWriter, r *http.Request) {
	var req calculateRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, fromDecode(err))
		return
	}

	op := calculator.Operation(r.PathValue("operation"))
	result, err := h.calc.Calculate(op, req.Operands)
	if err != nil {
		writeError(w, fromDomain(err))
		return
	}

	writeJSON(w, http.StatusOK, calculateResponse{Operation: op, Operands: req.Operands, Result: result})
}

func serveSpec(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/yaml")
	_, _ = w.Write(api.OpenAPISpec)
}

// docsPage renders the embedded spec with Scalar. The version is pinned so the
// docs never change underneath us.
const docsPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Quotient API</title>
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.72.3"></script>
  <script>Scalar.createApiReference('#app', { url: '/api/openapi.yaml', hideClientButton: true })</script>
</body>
</html>
`

func serveDocs(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(docsPage))
}

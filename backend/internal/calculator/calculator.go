// Package calculator implements the arithmetic operations exposed by the API.
// It is pure domain logic with no knowledge of HTTP or serialization.
package calculator

import (
	"fmt"
	"math"
	"strconv"
)

// Operation identifies a supported arithmetic operation.
type Operation string

// Supported operations. The string values are part of the public API.
const (
	Add        Operation = "add"
	Subtract   Operation = "subtract"
	Multiply   Operation = "multiply"
	Divide     Operation = "divide"
	Power      Operation = "power"
	Sqrt       Operation = "sqrt"
	Percentage Operation = "percentage"
)

// significantDigits caps result precision so binary floating-point noise
// (0.1 + 0.2 = 0.30000000000000004) never reaches the user. float64 carries
// 15–17 significant decimal digits, so 15 is the largest safe value.
const significantDigits = 15

// Descriptor describes an operation for clients that want to discover them.
type Descriptor struct {
	Name   Operation
	Symbol string
	Arity  int
}

type operation struct {
	Descriptor
	apply func(x []float64) (float64, error)
}

// operations is ordered so Operations returns a stable, keypad-friendly list.
var operations = []operation{
	{Descriptor{Add, "+", 2}, func(x []float64) (float64, error) { return x[0] + x[1], nil }},
	{Descriptor{Subtract, "−", 2}, func(x []float64) (float64, error) { return x[0] - x[1], nil }},
	{Descriptor{Multiply, "×", 2}, func(x []float64) (float64, error) { return x[0] * x[1], nil }},
	{Descriptor{Divide, "÷", 2}, divide},
	{Descriptor{Power, "^", 2}, func(x []float64) (float64, error) { return math.Pow(x[0], x[1]), nil }},
	{Descriptor{Sqrt, "√", 1}, sqrt},
	{Descriptor{Percentage, "%", 2}, func(x []float64) (float64, error) { return x[0] / 100 * x[1], nil }},
}

var byName = func() map[Operation]operation {
	m := make(map[Operation]operation, len(operations))
	for _, op := range operations {
		m[op.Name] = op
	}
	return m
}()

// Calculator evaluates the supported operations. The zero value is ready to use.
type Calculator struct{}

// Operations lists every supported operation in a stable order.
func (Calculator) Operations() []Descriptor {
	out := make([]Descriptor, len(operations))
	for i, op := range operations {
		out[i] = op.Descriptor
	}
	return out
}

// Calculate applies op to operands and returns the result rounded to 15
// significant digits. Percentage reads as "a% of b": percentage(a, b) = a/100 × b.
func (Calculator) Calculate(op Operation, operands []float64) (float64, error) {
	o, ok := byName[op]
	if !ok {
		return 0, fmt.Errorf("%w: %q", ErrUnknownOperation, op)
	}
	if len(operands) != o.Arity {
		return 0, fmt.Errorf("%w: %s expects %d, got %d", ErrOperandCount, op, o.Arity, len(operands))
	}
	for _, x := range operands {
		if math.IsNaN(x) || math.IsInf(x, 0) {
			return 0, ErrInvalidOperand
		}
	}

	result, err := o.apply(operands)
	if err != nil {
		return 0, err
	}
	switch {
	case math.IsNaN(result):
		return 0, ErrUndefinedResult
	case math.IsInf(result, 0):
		return 0, ErrResultOutOfRange
	}
	return normalize(result), nil
}

func divide(x []float64) (float64, error) {
	if x[1] == 0 {
		return 0, ErrDivisionByZero
	}
	return x[0] / x[1], nil
}

func sqrt(x []float64) (float64, error) {
	if x[0] < 0 {
		return 0, ErrNegativeSquareRoot
	}
	return math.Sqrt(x[0]), nil
}

// normalize rounds to significantDigits and folds -0 into 0.
func normalize(v float64) float64 {
	rounded, _ := strconv.ParseFloat(strconv.FormatFloat(v, 'g', significantDigits, 64), 64)
	if rounded == 0 {
		return 0
	}
	return rounded
}

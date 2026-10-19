package calculator_test

import (
	"errors"
	"math"
	"testing"

	"github.com/gutopin/quotient/backend/internal/calculator"
)

func TestCalculate(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		op       calculator.Operation
		operands []float64
		want     float64
	}{
		{"add integers", calculator.Add, []float64{2, 3}, 5},
		{"add negatives", calculator.Add, []float64{-2.5, -0.5}, -3},
		{"add hides float noise", calculator.Add, []float64{0.1, 0.2}, 0.3},
		{"subtract", calculator.Subtract, []float64{10, 4}, 6},
		{"subtract to negative", calculator.Subtract, []float64{4, 10}, -6},
		{"subtract float noise", calculator.Subtract, []float64{0.3, 0.1}, 0.2},
		{"multiply", calculator.Multiply, []float64{6, 7}, 42},
		{"multiply by zero", calculator.Multiply, []float64{123.45, 0}, 0},
		{"multiply negative zero is zero", calculator.Multiply, []float64{-5, 0}, 0},
		{"multiply float noise", calculator.Multiply, []float64{1.1, 1.1}, 1.21},
		{"divide", calculator.Divide, []float64{10, 4}, 2.5},
		{"divide repeating", calculator.Divide, []float64{1, 3}, 0.333333333333333},
		{"divide zero numerator", calculator.Divide, []float64{0, 7}, 0},
		{"power", calculator.Power, []float64{2, 10}, 1024},
		{"power negative exponent", calculator.Power, []float64{2, -2}, 0.25},
		{"power zero exponent", calculator.Power, []float64{0, 0}, 1},
		{"power fractional exponent", calculator.Power, []float64{9, 0.5}, 3},
		{"power negative base integer exponent", calculator.Power, []float64{-2, 3}, -8},
		{"sqrt", calculator.Sqrt, []float64{16}, 4},
		{"sqrt irrational", calculator.Sqrt, []float64{2}, 1.4142135623731},
		{"sqrt zero", calculator.Sqrt, []float64{0}, 0},
		{"percentage", calculator.Percentage, []float64{15, 200}, 30},
		{"percentage fractional", calculator.Percentage, []float64{12.5, 80}, 10},
		{"percentage of negative", calculator.Percentage, []float64{50, -10}, -5},
		{"large values stay finite", calculator.Multiply, []float64{1e154, 1e154}, 1e308},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got, err := calculator.Calculator{}.Calculate(tc.op, tc.operands)
			if err != nil {
				t.Fatalf("Calculate(%s, %v) unexpected error: %v", tc.op, tc.operands, err)
			}
			if got != tc.want {
				t.Errorf("Calculate(%s, %v) = %v, want %v", tc.op, tc.operands, got, tc.want)
			}
			if math.Signbit(got) && got == 0 {
				t.Errorf("Calculate(%s, %v) returned negative zero", tc.op, tc.operands)
			}
		})
	}
}

func TestCalculateErrors(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		op       calculator.Operation
		operands []float64
		wantErr  error
	}{
		{"unknown operation", "modulo", []float64{1, 2}, calculator.ErrUnknownOperation},
		{"empty operation", "", []float64{1, 2}, calculator.ErrUnknownOperation},
		{"too few operands", calculator.Add, []float64{1}, calculator.ErrOperandCount},
		{"too many operands", calculator.Add, []float64{1, 2, 3}, calculator.ErrOperandCount},
		{"no operands", calculator.Multiply, nil, calculator.ErrOperandCount},
		{"binary operands for sqrt", calculator.Sqrt, []float64{4, 2}, calculator.ErrOperandCount},
		{"NaN operand", calculator.Add, []float64{math.NaN(), 1}, calculator.ErrInvalidOperand},
		{"infinite operand", calculator.Add, []float64{math.Inf(1), 1}, calculator.ErrInvalidOperand},
		{"divide by zero", calculator.Divide, []float64{1, 0}, calculator.ErrDivisionByZero},
		{"divide zero by zero", calculator.Divide, []float64{0, 0}, calculator.ErrDivisionByZero},
		{"divide by negative zero", calculator.Divide, []float64{1, math.Copysign(0, -1)}, calculator.ErrDivisionByZero},
		{"sqrt of negative", calculator.Sqrt, []float64{-9}, calculator.ErrNegativeSquareRoot},
		{"even root of negative", calculator.Power, []float64{-8, 0.5}, calculator.ErrUndefinedResult},
		{"multiply overflow", calculator.Multiply, []float64{1e308, 10}, calculator.ErrResultOutOfRange},
		{"add overflow", calculator.Add, []float64{math.MaxFloat64, math.MaxFloat64}, calculator.ErrResultOutOfRange},
		{"power overflow", calculator.Power, []float64{10, 400}, calculator.ErrResultOutOfRange},
		{"zero to negative power", calculator.Power, []float64{0, -1}, calculator.ErrResultOutOfRange},
		{"divide overflow", calculator.Divide, []float64{1e308, 1e-10}, calculator.ErrResultOutOfRange},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got, err := calculator.Calculator{}.Calculate(tc.op, tc.operands)
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("Calculate(%s, %v) error = %v, want %v", tc.op, tc.operands, err, tc.wantErr)
			}
			if got != 0 {
				t.Errorf("Calculate(%s, %v) = %v alongside an error, want 0", tc.op, tc.operands, got)
			}
		})
	}
}

func TestOperations(t *testing.T) {
	t.Parallel()

	want := []calculator.Descriptor{
		{Name: calculator.Add, Symbol: "+", Arity: 2},
		{Name: calculator.Subtract, Symbol: "−", Arity: 2},
		{Name: calculator.Multiply, Symbol: "×", Arity: 2},
		{Name: calculator.Divide, Symbol: "÷", Arity: 2},
		{Name: calculator.Power, Symbol: "^", Arity: 2},
		{Name: calculator.Sqrt, Symbol: "√", Arity: 1},
		{Name: calculator.Percentage, Symbol: "%", Arity: 2},
	}

	got := calculator.Calculator{}.Operations()
	if len(got) != len(want) {
		t.Fatalf("Operations() returned %d operations, want %d", len(got), len(want))
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("Operations()[%d] = %+v, want %+v", i, got[i], want[i])
		}
	}

	got[0].Symbol = "mutated"
	if again := (calculator.Calculator{}).Operations(); again[0].Symbol != "+" {
		t.Error("Operations() exposes internal state to callers")
	}
}

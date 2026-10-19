package calculator

import "errors"

// Errors returned by Calculate. Callers should match them with errors.Is,
// since some are wrapped with extra detail.
var (
	ErrUnknownOperation   = errors.New("unknown operation")
	ErrOperandCount       = errors.New("wrong number of operands")
	ErrInvalidOperand     = errors.New("operand must be a finite number")
	ErrDivisionByZero     = errors.New("cannot divide by zero")
	ErrNegativeSquareRoot = errors.New("cannot take the square root of a negative number")
	ErrUndefinedResult    = errors.New("result is not a real number")
	ErrResultOutOfRange   = errors.New("result is too large to represent")
)

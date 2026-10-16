//go:build !windows

// Package shapes shows Go comment conventions. Hover the comments!
package shapes

import "fmt"

// Area returns the area of a w×h rectangle.
// It panics if w or h is negative; see [Perimeter].
//
// Deprecated: Use [Rect.Area] instead.
func Area(w, h float64) float64 {
	if w < 0 || h < 0 {
		panic("negative size") // a trailing comment
	}
	return w * h
}

// TODO: support circles.

/* A block comment,
   on two lines. */
func Perimeter(w, h float64) float64 { return 2 * (w + h) }

//go:generate stringer -type=Color
type Color int

func ExampleArea() {
	fmt.Println(Area(2, 3))
	// Output: 6
}

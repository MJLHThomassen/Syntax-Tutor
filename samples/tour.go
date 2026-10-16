// A small tour of Go syntax. Hover anything, or put the cursor on a keyword
// or a declaration name to see its scope highlighted.
package main

import (
	"errors"
	"fmt"
	str "strings"
)

type Shape interface {
	Area() float64
}

type Rect struct {
	Width, Height float64
}

func (r *Rect) Area() float64 {
	return r.Width * r.Height
}

const (
	Small = iota
	Medium
	Large
)

func divide(a, b int) (int, error) {
	if b == 0 {
		return 0, errors.New("divide by zero")
	}
	return a / b, nil
}

func sum(nums ...int) int {
	total := 0
	for _, n := range nums {
		total += n
	}
	return total
}

func Max[T ~int | ~float64](a, b T) T {
	if a > b {
		return a
	}
	return b
}

func main() {
	ch := make(chan int, 1)
	done := make(chan struct{})
	go func() {
		defer close(done)
		ch <- 42
	}()
	v := <-ch
	<-done

	var p *Rect = &Rect{Width: 2, Height: 3}
	fmt.Println(v, p.Area(), str.ToUpper("héllo 👋"), sum([]int{1, 2}...))

outer:
	for i := 0; i < 3; i++ {
		for j := range 3 {
			if j == i {
				continue outer
			}
			if i == 2 {
				break outer
			}
		}
	}

	var s Shape = p
	switch x := s.(type) {
	case *Rect:
		fmt.Println("rect", x.Width)
	default:
		fmt.Println("unknown")
	}

	switch {
	case v > 40:
		fmt.Println("big")
		fallthrough
	case v > 10:
		fmt.Println("medium")
	}

	select {
	case n := <-ch:
		fmt.Println(n)
	default:
		fmt.Println("nothing ready")
	}

	if q, err := divide(1, 0); err != nil {
		fmt.Println("error:", err)
	} else {
		fmt.Println(q, len(`raw\nstring`), 'x', Max(1, 2))
	}
}

//! Shapes: a tiny crate showing Rust comment conventions.

/// Returns the area of a `w`×`h` rectangle.
///
/// # Examples
///
/// ```
/// assert_eq!(area(2.0, 3.0), 6.0);
/// ```
///
/// # Panics
///
/// Panics if `w` or `h` is negative. See [`perimeter`].
#[inline]
pub fn area(w: f64, h: f64) -> f64 {
    assert!(w >= 0.0 && h >= 0.0); // a trailing comment
    w * h
}

/* A block comment /* that nests */ in Rust. */
pub fn perimeter(w: f64, h: f64) -> f64 {
    2.0 * (w + h)
}

/// Reads a value through a raw pointer.
///
/// # Safety
///
/// `p` must be valid and aligned.
pub unsafe fn read(p: *const i32) -> i32 {
    // SAFETY: the caller guarantees `p` is valid.
    unsafe { *p }
}

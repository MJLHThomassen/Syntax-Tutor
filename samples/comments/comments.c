#include <stddef.h>

/**
 * @brief Copies @p n bytes from @p src to @p dst.
 *
 * @param[out] dst Destination buffer.
 * @param[in]  src Source buffer.
 * @param      n   Number of bytes.
 * @return @p dst
 * @warning The buffers must not overlap.
 */
void *copy(void *dst, const void *src, size_t n);

/// Returns the larger of @p a and @p b.
int max(int a, int b) { return a > b ? a : b; } // trailing comment

/* TODO: add min() */
// NOLINT(readability-magic-numbers)

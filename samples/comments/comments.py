#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Shapes: a tiny module showing Python comment and docstring conventions.

Hover the comments and the docstrings!
"""
import math  # noqa: F401

# TODO: support circles.

#: The default unit for lengths.
UNIT = "cm"


def area(w, h):
    """Return the area of a w×h rectangle.

    Args:
        w (float): The width. Must not be negative.
        h (float): The height.

    Returns:
        float: The area.

    Raises:
        ValueError: If w or h is negative.

    Examples:
        >>> area(2, 3)
        6
    """
    if w < 0 or h < 0:
        raise ValueError("negative size")  # a trailing comment
    return w * h


def perimeter(w, h):
    """Return the perimeter of a rectangle.

    Parameters
    ----------
    w : float
        The width.
    h : float
        The height.

    Returns
    -------
    float
        The perimeter.
    """
    return 2 * (w + h)


class Rect:
    """A rectangle.

    :param w: The width.
    :param h: The height.
    :raises ValueError: If a side is negative. See :func:`area`.

    .. deprecated:: 2.0
       Use plain tuples instead.
    """

    def __init__(self, w, h):
        # Plain comments
        # on two lines.
        self.w = w
        self.h = h

    def scaled(self, factor):  # type: (float) -> Rect
        return Rect(self.w * factor, self.h * factor)  # pragma: no cover

    # pylint: disable=invalid-name
    def A(self):
        return area(self.w, self.h)  # fmt: skip

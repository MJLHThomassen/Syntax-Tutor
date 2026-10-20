# A small tour of Python syntax. Hover anything, or put the cursor on a keyword
# or a declaration name to see its scope highlighted.
from __future__ import annotations

import os
import sys as system
from collections import defaultdict, namedtuple as nt
from dataclasses import dataclass
from typing import *

PI: float = 3.14159
counter = 0
type Pair[T] = tuple[T, T]


@dataclass
class Point:
    """A point in the plane."""

    x: float
    y: float = 0.0

    def __add__(self, other: Point) -> Point:
        return Point(self.x + other.x, self.y + other.y)

    @classmethod
    def origin(cls) -> Point:
        return cls(0, 0)

    @property
    def length(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5


class Shape(object):
    def area(self) -> float:
        raise NotImplementedError("subclasses define this")


def divide(a, b, /, *, strict=False):
    if b == 0:
        if strict:
            raise ZeroDivisionError("divide by zero") from None
        return None
    elif a < 0:
        return -(a // b)
    else:
        return a / b


def total(*nums, **options):
    global counter
    counter += 1
    result = 0
    for n in nums:
        if n is None or n is not n:
            continue
        result += n
    else:
        print("summed", len(nums), "numbers")
    return result


def make_adder(start):
    count = start

    def add(step=1):
        nonlocal count
        count += step
        return count

    return add


def countdown(n):
    while n > 0:
        yield n
        n -= 1
        if n == 2:
            break
    yield from range(3)


async def fetch(url):
    async with open_session() as session:
        data = await session.get(url)
    async for chunk in data:
        print(chunk)
    return data


def describe(value):
    match value:
        case 0 | 1:
            return "small"
        case [first, *rest]:
            return f"list starting with {first!r}"
        case {"name": name, **extra}:
            return f"named {name:>10}"
        case Point(x=0, y=yy) if yy > 0:
            return "on the y axis"
        case str() as text:
            return text
        case _:
            return "something else"


def main():
    numbers = [n * n for n in range(10) if n % 2 == 0]
    squares = {n: n ** 2 for n in numbers}
    unique = {abs(n) for n in numbers}
    lazy = (n for n in numbers)
    first, *others = numbers
    pairs = list(zip(numbers, others))
    nested = numbers[1:-1:2]
    flags = 0b1010 & 0xFF | 0o7 ^ ~1 << 2 >> 1
    big = 1_000_000 + 2.5e3 + 3j
    raw = r"C:\temp\new"
    data = b"bytes"
    text = """multi
line"""
    greeting = f"héllo 👋 {first + 1} and {squares!s}"
    if (size := len(numbers)) > 3 and not unique:
        print(size, file=system.stderr)
    del pairs[0]
    if 4 in squares and 5 not in unique:
        print("found")
    assert isinstance(numbers, list), "expected a list"
    try:
        value = divide(1, 0, strict=True)
        if value is None:
            raise ValueError("no result")
    except (ZeroDivisionError, ValueError) as error:
        print("error:", error)
    except Exception:
        raise
    else:
        print(value)
    finally:
        print("done")
    with open(os.devnull, "w") as out, open(os.devnull) as inp:
        out.write(raw)
    square = lambda x: x * x
    label = "big" if big > 100 else "small"
    product = weights @ inputs  # @ is matrix multiplication, e.g. for NumPy arrays
    options = {**{"sep": ", "}, "end": "\n"}
    print(*numbers, **options)
    numbers.sort(key=lambda n: -n)
    result = sorted(enumerate(numbers), reverse=True)
    print(sum(numbers), min(numbers), max(numbers), square(3), label, text, data, nested, flags, result, lazy, greeting, product)
    pass


if __name__ == "__main__":
    main()

// A tour of TypeScript. Hover anything to learn what it means.
import type { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';

export type ID = string | number;
type Point = { x: number; y: number } & { label?: string };

export interface Shape {
  readonly name: string;
  area(): number;
  [key: string]: unknown;
}

interface Square extends Shape {
  side: number;
}

enum Color {
  Red = 'RED',
  Green = 'GREEN',
}

declare const VERSION: string;

namespace Geometry {
  export const ORIGIN: Point = { x: 0, y: 0 };
}

abstract class Base implements Shape {
  [key: string]: unknown;
  static instances = 0;
  #hidden = true;
  private secret = 1;
  protected kind: string = 'base';
  public readonly name: string;

  constructor(name: string, public tag?: string) {
    this.name = name;
  }

  abstract area(): number;
}

class Circle extends Base {
  constructor(private radius: number) {
    super('circle');
  }

  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

function sealed(target: Function): void {
  Object.seal(target);
}

@sealed
class Tagged {}

function first<T>(items: T[]): T | undefined {
  return items[0];
}

function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function fail(message: string): never {
  throw new Error(message);
}

type Keys = keyof Point;
type PointCopy = typeof Geometry.ORIGIN;
type ElementOf<A> = A extends (infer E)[] ? E : never;
type Optional<T> = { [K in keyof T]?: T[K] };
type Frozen = Readonly<Point>;
type Small = Pick<Point, 'x'> | Omit<Point, 'y'> | Partial<Point>;
type Lookup = Record<string, ID>;
type Made = ReturnType<typeof first>;

let loose: any = 4;
const config = { mode: 'dark', greeting: "héllo 👋" } as const;
const palette = { red: [255, 0, 0] } satisfies Record<string, number[]>;
const el = document.getElementById('app')!;
const len = (loose as string).length;
const cast = <number>loose;
const maybe = el?.textContent ?? '';

async function load(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.statusText);
    return res.text();
  } catch {
    return '';
  }
}

export default function describe(shape: Shape, opts?: { verbose: boolean }): string {
  if (isString(shape.name) && opts?.verbose) {
    return `${shape.name}: ${shape.area()}`;
  }
  return shape.name;
}

const pairs: Array<[string, number]> = [['a', 1]];
const sq: Square = { name: 'sq', side: 2, area: () => 4 };
console.log(Color.Red, VERSION, len, cast, maybe, pairs, sq, config, palette, new EventEmitter());

// A small tour of Rust syntax. Hover anything, or put the cursor on a keyword
// or a declaration name to see its scope highlighted.
use std::collections::HashMap;
use std::fmt::{self, Display};

#[derive(Debug, Clone, PartialEq)]
pub struct Point {
    x: i32,
    y: i32,
}

pub enum Shape {
    Circle { r: f64 },
    Rect(f64, f64),
    Empty,
}

trait Area {
    fn area(&self) -> f64;
}

impl Area for Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Circle { r } => 3.14 * r * r,
            Shape::Rect(w, h) if *w > 0.0 => w * h,
            _ => 0.0,
        }
    }
}

impl Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() > b.len() { a } else { b }
}

fn parse_all(items: &[&str]) -> Result<Vec<i32>, std::num::ParseIntError> {
    let mut out = Vec::new();
    for item in items {
        let n = item.trim().parse::<i32>()?;
        out.push(n);
    }
    Ok(out)
}

fn main() {
    let mut counts: HashMap<&str, usize> = HashMap::new();
    let words = vec!["héllo", "👋", "héllo"];
    for w in &words {
        *counts.entry(w).or_insert(0) += 1;
    }

    let p = Point { x: 1, y: 2 };
    let q = Point { y: 5, ..p.clone() };
    println!("{p} {q:?} {}", longest("a", "bcd"));

    let mut total = 0;
    'outer: loop {
        while total < 10 {
            total += 3;
            if total > 6 {
                break 'outer;
            }
        }
    }

    let add = move |a: i32| a + total;
    let raw = r#"no \n escape "here""#;
    let Some(first) = words.first() else {
        return;
    };

    if let Ok(nums) = parse_all(&["1", "2"]) {
        println!("{nums:?} {} {raw} {first}", add(1));
    } else {
        eprintln!("parse error");
    }

    let r = &mut total;
    *r += 1;
    let c = 'c' as u32;
    for i in 0..=c % 3 {
        if i == 1 {
            continue;
        }
    }
}

// A tour of C#. Hover anything to see what it means.
using System;
using System.Collections.Generic; // System.Linq, System.Threading.Tasks: implicit usings
using static System.Math;

namespace Tour;

public enum Color { Red, Green = 2, Blue }

public interface IShape
{
    double Area();
    string Name => GetType().Name;
}

public record Point(int X, int Y);

public readonly struct Size
{
    public int Width { get; init; }
    public required int Height { get; set; }
}

public delegate int Combine(int a, int b);
public abstract class Shape : IShape
{
    protected const double Tau = 2 * PI;
    private static int count;
    public event EventHandler? Changed;

    protected Shape() { count++; }
    public abstract double Area();
    public virtual string Describe() => $"{GetType().Name} with area {Area():F2}";
}

public sealed partial class Circle : Shape
{
    private double radius;

    public Circle(double radius) : base() { this.radius = radius; }
    public double Radius { get => radius; set { radius = value < 0 ? 0 : value; } }
    public override double Area() => Tau / 2 * radius * radius;
    public new string ToString() => "circle";
    public static Circle operator +(Circle a, Circle b) => new(a.radius + b.radius);
    public static implicit operator double(Circle c) => c.radius;
}

public static class Program
{
    static T Largest<T>(IEnumerable<T> items) where T : IComparable<T>
    {
        T best = default!;
        foreach (var item in items)
        {
            if (item.CompareTo(best) > 0 || best is null) best = item;
        }
        return best;
    }

    static IEnumerable<int> Evens(int limit)
    {
        for (int i = 0; ; i += 2)
        {
            if (i > limit) yield break;
            yield return i;
        }
    }

    static bool TryHalve(int n, out int half, ref int calls, in int bonus, params int[] rest)
    {
        calls++;
        half = n / 2 + bonus + rest.Length;
        return n % 2 == 0;
    }

    static string Classify(object o) => o switch
    {
        int n when n < 0 => "negative",
        int and > 100 => "big",
        string { Length: 0 } => "empty",
        not null => "something",
        _ => "null",
    };

    static async Task<int> FetchAsync(string? name)
    {
        await Task.Delay(10);
        string label = name ?? "anonymous";
        name ??= label;
        int? length = name?.Length;
        return length ?? 0;
    }

    static void Main(string[] args)
    {
        var words = new List<string> { "héllo 👋", "world", nameof(Main) };
        var ages = new Dictionary<string, int> { ["ann"] = 31 };
        int[] nums = { 5, 3, 8, 1 };
        Console.WriteLine($"Largest: {Largest(nums)}, last: {nums[^1]}, middle: {nums[1..3].Length}");
        string path = @"C:\temp\file.txt";
        string json = """{"x": 1}""";
        char? first = args?[0][0];

        var query = from w in words
                    where w.Length > 4
                    orderby w descending
                    select w.ToUpper();

        Point p = new(1, 2);
        Point q = p with { Y = 5 };
        Combine add = (a, b) => a + b;
        Shape? s = (object)q as Shape;
        Console.WriteLine(s!.Describe() + typeof(Point) + nameof(args) + sizeof(int));

        try
        {
            checked { Console.WriteLine(int.MaxValue + unchecked(nums[0] * 2)); }
            throw new InvalidOperationException("nope");
        }
        catch (InvalidOperationException ex) when (ex.Message != "")
        {
            Console.WriteLine(ex.Message);
        }
        finally
        {
            lock (words) { words.Clear(); }
        }

        switch (DateTime.Now.DayOfWeek)
        {
            case DayOfWeek.Saturday:
                goto weekend;
            case DayOfWeek.Sunday:
                break;
            default:
                while (true) { if (path.Length > 0) break; else continue; }
                do { } while (false);
                break;
        }
        weekend:
        using (var file = new global::System.IO.StringReader(json)) { }
        dynamic anything = path;
    }
}

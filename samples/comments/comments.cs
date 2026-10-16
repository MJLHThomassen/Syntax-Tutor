using System;

public class Calculator
{
    /// <summary>
    /// Divides <paramref name="a"/> by <paramref name="b"/>.
    /// </summary>
    /// <param name="a">The dividend.</param>
    /// <param name="b">The divisor.</param>
    /// <returns>The quotient.</returns>
    /// <exception cref="DivideByZeroException">If <paramref name="b"/> is 0.</exception>
    /// <seealso cref="Multiply"/>
    [Obsolete("Use Div instead")]
    public double Divide(double a, double b) => a / b; // trailing comment

    /// <inheritdoc/>
    public override string ToString() => "Calculator";

    // ReSharper disable once UnusedMember.Global
    public double Multiply(double a, double b) => a * b; /* block */
}

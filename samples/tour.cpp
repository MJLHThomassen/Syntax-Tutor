// A small tour of C++ syntax. Hover anything, or put the cursor on a keyword
// or a declaration name to see its scope highlighted.
#include <iostream>
#include <map>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <vector>

using namespace std::string_literals;

namespace geo {

template <typename T>
concept Numeric = std::is_arithmetic_v<T>;

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual std::string name() const { return "shape"; }
};

class Rect final : public Shape {
public:
    Rect(double w, double h) : width_(w), height_(h) {}
    explicit Rect(double side) : Rect(side, side) {}

    double area() const override { return width_ * height_; }
    std::string name() const override { return "rect"; }

    Rect operator*(double k) const { return Rect(width_ * k, height_ * k); }
    friend std::ostream &operator<<(std::ostream &os, const Rect &r);

private:
    double width_;
    double height_;
    mutable int reads_ = 0;
    static inline int count_ = 0;
};

std::ostream &operator<<(std::ostream &os, const Rect &r) {
    return os << "Rect(" << r.width_ << " x " << r.height_ << ")";
}

}  // namespace geo

enum class Level { Low, High };

struct Config {
    std::string title = R"(C:\temp\"quoted")";
    Level level = Level::Low;
};

template <typename T>
T largest(const std::vector<T> &items) {
    if (items.empty()) {
        throw std::invalid_argument("empty");
    }
    T best = items[0];
    for (const auto &item : items) {
        if (item > best) best = item;
    }
    return best;
}

template <geo::Numeric T, typename... Rest>
constexpr T total(T first, Rest... rest) {
    return (first + ... + rest);
}

consteval int square(int x) { return x * x; }

std::optional<int> find(const std::map<std::string, int> &ages, const std::string &who) noexcept {
    auto it = ages.find(who);
    if (it == ages.end()) return std::nullopt;
    return it->second;
}

void consume(std::string &&text) {
    std::string owned = std::move(text);
    std::cout << owned.size() << std::endl;
}

int main() {
    using geo::Rect;
    std::unique_ptr<geo::Shape> shape = std::make_unique<Rect>(2.0, 3.0);
    std::shared_ptr<Rect> shared = std::make_shared<Rect>(4.0);
    std::vector<int> nums{3, 1, 4, 1, 5};
    std::map<std::string, int> ages{{"ada", 36}, {"alan", 41}};
    const std::string greeting = "héllo 👋"s;
    int factor = 2;

    auto scale = [factor](int n) { return n * factor; };
    auto bump = [&](int n) mutable { factor += n; return factor; };
    auto all = [=] { return factor; };

    for (int &n : nums) {
        n = scale(n);
    }

    try {
        if (nums.empty()) throw std::runtime_error("no numbers");
        std::cout << largest(nums) << ' ' << total(1, 2, 3) << '\n';
        std::cout << largest(std::vector<int>{}) << '\n';
    } catch (const std::invalid_argument &e) {
        std::cerr << "error: " << e.what() << '\n';
    } catch (...) {
        throw;
    }

    if (auto age = find(ages, "ada"); age.has_value()) {
        std::cout << *age << ' ' << ages.at("alan") << '\n';
    }

    for (const auto &[who, age] : ages) {
        if (age > 40 && who != "ada") continue;
        std::cout << who << '\n';
    }

    Rect *raw = new Rect(1.0);
    auto *base = static_cast<geo::Shape *>(raw);
    if (auto *r = dynamic_cast<Rect *>(base)) std::cout << *r << '\n';
    delete raw;

    const int limit = 10;
    int &alias = const_cast<int &>(limit);
    decltype(factor) copy = factor;
    std::size_t n = sizeof(Config) + square(3) + bump(1) + all() + copy + alias;
    consume("moved"s);
    std::cout << shape->area() << shared->name() << n << (factor << 1) << std::endl;
    Config cfg{};
    return cfg.level == Level::High ? 1 : 0;
}

import Foundation

enum CurrencyFormatter {
    private static let full: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = Locale(identifier: "en_US")
        f.maximumFractionDigits = 2
        f.minimumFractionDigits = 0
        return f
    }()

    private static let compactFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = Locale(identifier: "en_US")
        f.maximumFractionDigits = 0
        return f
    }()

    /// Format as "$1,234.56" (full precision)
    static func format(_ amount: Double) -> String {
        full.string(from: NSNumber(value: amount)) ?? "$\(amount)"
    }

    /// Compact: "$1.2K", "$3.5M" for large values; "$123" for small.
    static func compact(_ amount: Double) -> String {
        if amount >= 1_000_000 {
            return String(format: "$%.1fM", amount / 1_000_000)
        } else if amount >= 1_000 {
            return String(format: "$%.1fK", amount / 1_000)
        } else {
            return compactFormatter.string(from: NSNumber(value: amount)) ?? "$\(Int(amount))"
        }
    }
}

/// Reads a number typed into a text field in the user's locale: "1,500.50"
/// in the US, "1.500,50" or "1,5" in Germany. Stripping commas and calling
/// `Double(_:)` turns a German "1,5" into 15.
enum NumberInput {
    private static let formatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = .current
        return f
    }()

    static func double(_ text: String) -> Double? {
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return nil }
        // In a comma-decimal locale "." is the grouping separator, so the
        // formatter would read "1.5" as 15. Input with a "." and no "," there
        // is a decimal typed on a hardware or pasted keyboard.
        if formatter.decimalSeparator == ",", trimmed.contains("."), !trimmed.contains(","),
           let value = Double(trimmed) {
            return value
        }
        if let number = formatter.number(from: trimmed) { return number.doubleValue }
        // A "." typed on a keyboard whose locale uses ",".
        return Double(trimmed)
    }
}

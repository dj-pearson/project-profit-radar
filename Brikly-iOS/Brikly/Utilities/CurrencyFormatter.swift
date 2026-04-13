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

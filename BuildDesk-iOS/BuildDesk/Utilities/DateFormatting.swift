import Foundation

enum DateFormatting {
    private static let mediumFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f
    }()

    private static let shortFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f
    }()

    private static let isoDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        return f
    }()

    /// "Jan 15, 2024" format. Returns "—" if nil.
    static func medium(_ date: Date?) -> String {
        guard let date else { return "—" }
        return mediumFormatter.string(from: date)
    }

    /// "Jan 15" short format.
    static func short(_ date: Date?) -> String {
        guard let date else { return "—" }
        return shortFormatter.string(from: date)
    }

    static func short(_ date: Date) -> String {
        shortFormatter.string(from: date)
    }

    /// "2024-01-15" ISO date string for inserts.
    static func isoDate(_ date: Date) -> String {
        isoDateFormatter.string(from: date)
    }
}

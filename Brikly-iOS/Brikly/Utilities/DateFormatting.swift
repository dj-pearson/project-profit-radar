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

    private static let localISODateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    private static let utcMediumFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        f.timeZone = TimeZone(secondsFromGMT: 0)
        return f
    }()

    /// "2024-01-15" in the device's time zone. Use this for a calendar day the
    /// user picked: `isoDate` converts to UTC, which moves an evening pick in
    /// the Americas to the next day.
    static func localISODate(_ date: Date) -> String {
        localISODateFormatter.string(from: date)
    }

    /// Display a PostgreSQL `date` string ("2024-01-15" or a timestamp) as
    /// "Jan 15, 2024" without shifting it across a time zone. "—" if nil.
    static func displayDate(_ isoString: String?) -> String {
        guard let isoString, !isoString.isEmpty else { return "—" }
        guard let date = isoDateFormatter.date(from: String(isoString.prefix(10))) else { return isoString }
        return utcMediumFormatter.string(from: date)
    }
}

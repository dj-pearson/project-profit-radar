import Foundation

/// A custom `JSONDecoder.DateDecodingStrategy` that handles the many date/timestamp
/// formats returned by PostgreSQL + PostgREST, including:
///   "2024-01-15T10:30:00Z"
///   "2024-01-15T10:30:00+00:00"
///   "2024-01-15T10:30:00.123456+00:00"
///   "2024-01-15T10:30:00"
///   "2024-01-15"
enum PostgresDateDecoding {

    /// Ordered list of formatters to try – most common first.
    static let formatters: [DateFormatter] = {
        let timeZone = TimeZone(secondsFromGMT: 0)
        let locale = Locale(identifier: "en_US_POSIX")

        func make(_ format: String) -> DateFormatter {
            let f = DateFormatter()
            f.locale = locale
            f.timeZone = timeZone
            f.dateFormat = format
            return f
        }

        return [
            make("yyyy-MM-dd'T'HH:mm:ssXXXXX"),       // 2024-01-15T10:30:00+00:00
            make("yyyy-MM-dd'T'HH:mm:ss.SSSXXXXX"),    // 2024-01-15T10:30:00.123+00:00
            make("yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXXXX"), // 2024-01-15T10:30:00.123456+00:00
            make("yyyy-MM-dd'T'HH:mm:ss'Z'"),          // 2024-01-15T10:30:00Z
            make("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),      // 2024-01-15T10:30:00.123Z
            make("yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'"),   // 2024-01-15T10:30:00.123456Z
            make("yyyy-MM-dd'T'HH:mm:ss"),              // 2024-01-15T10:30:00 (no TZ)
            make("yyyy-MM-dd"),                          // 2024-01-15 (date only)
        ]
    }()

    /// ISO8601 formatter with fractional seconds (available on newer Apple platforms).
    static let iso8601WithFractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    static let iso8601: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    /// The custom strategy to assign to `JSONDecoder.dateDecodingStrategy`.
    static var strategy: JSONDecoder.DateDecodingStrategy {
        .custom { decoder in
            let container = try decoder.singleValueContainer()
            let string = try container.decode(String.self)

            // Fast path: ISO 8601 (covers ~90% of timestamps)
            if let date = iso8601.date(from: string) { return date }
            if let date = iso8601WithFractional.date(from: string) { return date }

            // Slow path: try each DateFormatter
            for formatter in formatters {
                if let date = formatter.date(from: string) { return date }
            }

            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Unable to decode date string: \(string)"
            )
        }
    }
}

import Foundation

/// Provides human-readable descriptions for `DecodingError` cases,
/// making it much easier to debug Supabase response parsing issues.
enum DecodingErrorHelper {

    static func describe(_ error: DecodingError) -> String {
        switch error {
        case .typeMismatch(let type, let context):
            let path = context.codingPath.map(\.stringValue).joined(separator: ".")
            return "Type mismatch: expected \(type) at '\(path)'. \(context.debugDescription)"

        case .valueNotFound(let type, let context):
            let path = context.codingPath.map(\.stringValue).joined(separator: ".")
            return "Value not found: expected \(type) at '\(path)'. \(context.debugDescription)"

        case .keyNotFound(let key, let context):
            let path = context.codingPath.map(\.stringValue).joined(separator: ".")
            return "Key '\(key.stringValue)' not found at '\(path)'. \(context.debugDescription)"

        case .dataCorrupted(let context):
            let path = context.codingPath.map(\.stringValue).joined(separator: ".")
            return "Data corrupted at '\(path)'. \(context.debugDescription)"

        @unknown default:
            return error.localizedDescription
        }
    }

    /// Logs a decoding error and returns a user-facing message.
    static func handle(_ error: Error, context: String = "") -> String {
        if let decodingError = error as? DecodingError {
            let detail = describe(decodingError)
            print("[\(context)] Decoding error: \(detail)")
            return "Data format error. Please try again."
        }
        print("[\(context)] Error: \(error.localizedDescription)")
        return error.localizedDescription
    }
}

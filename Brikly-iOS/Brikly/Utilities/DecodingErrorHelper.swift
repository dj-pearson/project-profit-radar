import Foundation
import os
#if canImport(Sentry)
import Sentry
#endif

/// Category-tagged loggers. Use these instead of `print()` so messages
/// reach the unified system log and can be filtered by `Console.app`,
/// `log stream`, or future remote-logging hooks.
enum Loggers {
    private static let subsystem = "net.brikly.app"

    static let auth = Logger(subsystem: subsystem, category: "Auth")
    static let services = Logger(subsystem: subsystem, category: "Services")
    static let viewModels = Logger(subsystem: subsystem, category: "ViewModels")
    static let edge = Logger(subsystem: subsystem, category: "EdgeFunctions")
    static let app = Logger(subsystem: subsystem, category: "App")
}

// MARK: - Crash Reporting

/// Crash and error reporting facade. The default implementation is a no-op
/// so the app builds without any external dependency. To enable real
/// reporting, add the Sentry SPM package to the Xcode project — the
/// `canImport(Sentry)` guard below will switch in the real adapter
/// automatically; no other code changes are required.
///
/// Set `SENTRY_DSN` in Info.plist (recommended: inject via CI, the same way
/// SUPABASE_ANON_KEY is). Without a DSN, the adapter stays disabled.
enum CrashReporter {
    /// Initialize crash reporting. Call once early in app launch.
    static func start() {
        #if canImport(Sentry)
        guard let dsn = Bundle.main.infoDictionary?["SENTRY_DSN"] as? String,
              !dsn.isEmpty, !dsn.hasPrefix("$(") else {
            Loggers.app.notice("Sentry DSN not configured; crash reporting disabled.")
            return
        }
        SentrySDK.start { options in
            options.dsn = dsn
            options.environment = isDebug ? "debug" : "production"
            options.tracesSampleRate = 0.1
            options.attachStacktrace = true
            options.enableAutoSessionTracking = true
        }
        Loggers.app.info("Sentry crash reporting enabled.")
        #else
        Loggers.app.debug("CrashReporter no-op (Sentry SDK not linked).")
        #endif
    }

    /// Associate the current user with subsequent reports. Pass `nil` on sign-out.
    static func setUser(id: String?, email: String?) {
        #if canImport(Sentry)
        if let id {
            let user = User(userId: id)
            user.email = email
            SentrySDK.setUser(user)
        } else {
            SentrySDK.setUser(nil)
        }
        #endif
    }

    /// Record a non-fatal error.
    static func capture(_ error: Error, context: String? = nil) {
        Loggers.app.error("\(context ?? "Error", privacy: .public): \(error.localizedDescription, privacy: .public)")
        #if canImport(Sentry)
        SentrySDK.capture(error: error) { scope in
            if let context { scope.setTag(value: context, key: "context") }
        }
        #endif
    }

    /// Record a free-form breadcrumb that's attached to the next captured event.
    static func breadcrumb(_ message: String, category: String = "app") {
        #if canImport(Sentry)
        let crumb = Breadcrumb(level: .info, category: category)
        crumb.message = message
        SentrySDK.addBreadcrumb(crumb)
        #endif
    }

    private static var isDebug: Bool {
        #if DEBUG
        true
        #else
        false
        #endif
    }
}

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
            Loggers.services.error("[\(context, privacy: .public)] Decoding error: \(detail, privacy: .public)")
            return "Data format error. Please try again."
        }
        Loggers.services.error("[\(context, privacy: .public)] Error: \(error.localizedDescription, privacy: .public)")
        return error.localizedDescription
    }
}

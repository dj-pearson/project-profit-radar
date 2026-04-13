import Foundation

enum AppConfiguration {
    // MARK: - Supabase

    /// Supabase project URL (Kong API gateway)
    /// Reads from Info.plist first (injected at build time), then falls back to the
    /// hardcoded production value. Never empty.
    static var supabaseURL: String {
        if let value = Bundle.main.infoDictionary?["SUPABASE_URL"] as? String,
           !value.isEmpty, !value.hasPrefix("$("), value.hasPrefix("http") {
            return value
        }
        return "https://api.build-desk.com"
    }

    /// Supabase anonymous/publishable key.
    /// This is a *public* key — security is enforced by Row Level Security, not key secrecy.
    /// Reads from Info.plist first (injected at build time via GitHub Actions secret),
    /// then falls back to the hardcoded production value so local/Simulator builds work.
    static var supabaseAnonKey: String {
        // 1. Info.plist (injected by GitHub Actions at build time)
        if let key = Bundle.main.infoDictionary?["SUPABASE_ANON_KEY"] as? String,
           !key.isEmpty, !key.hasPrefix("$("), key.hasPrefix("eyJ") {
            return key
        }
        // 2. Environment variable (Xcode scheme or CI)
        if let key = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"],
           !key.isEmpty {
            return key
        }
        // 3. Hardcoded fallback (public anon key — safe to commit)
        return "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NjAwNzA2MCwiZXhwIjo0OTIxNjgwNjYwLCJyb2xlIjoiYW5vbiJ9.0ZmnSLWlt3HntC4M7j12YgPt7DwuP23EoZzCDkp9kFk"
    }

    /// Edge functions base URL
    static var edgeFunctionsURL: String {
        "https://functions.build-desk.com"
    }
}

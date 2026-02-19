import Foundation

enum AppConfiguration {
    /// Supabase project URL (Kong API gateway)
    static let supabaseURL = "https://api.build-desk.com"

    /// Supabase anonymous/publishable key
    /// In production, inject via Xcode build settings or Info.plist.
    /// For development, set a default here or read from the environment.
    static var supabaseAnonKey: String {
        if let key = Bundle.main.infoDictionary?["SUPABASE_ANON_KEY"] as? String, !key.isEmpty {
            return key
        }
        if let key = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"], !key.isEmpty {
            return key
        }
        // Fallback – replace with your actual anon key for local development
        return ""
    }

    /// Edge functions base URL
    static let edgeFunctionsURL = "\(supabaseURL)/functions/v1"
}

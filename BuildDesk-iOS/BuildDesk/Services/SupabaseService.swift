import Foundation
import Supabase

/// Singleton that owns the Supabase client and shared JSON decoder.
@MainActor
final class SupabaseService {
    static let shared = SupabaseService()

    let client: SupabaseClient

    /// Shared decoder configured with snake_case → camelCase conversion
    /// and the PostgreSQL multi-format date fallback chain.
    let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        d.dateDecodingStrategy = PostgresDateDecoding.strategy
        return d
    }()

    private init() {
        let url = URL(string: AppConfiguration.supabaseURL)!
        let key = AppConfiguration.supabaseAnonKey

        if key.isEmpty {
            print("[SupabaseService] WARNING: Supabase anon key is empty. API calls will fail.")
        }

        client = SupabaseClient(
            supabaseURL: url,
            supabaseKey: key
        )
    }
}

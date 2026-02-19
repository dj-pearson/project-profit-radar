import Foundation
import Supabase

/// Singleton that owns the Supabase client and shared JSON decoder.
@MainActor
final class SupabaseService {
    static let shared = SupabaseService()

    let client: SupabaseClient

    /// Shared decoder configured with snake_case → camelCase conversion
    /// and the PostgreSQL multi-format date fallback chain.
    /// This same instance is registered with the SupabaseClient so that
    /// all PostgREST `.value` calls (including fetchProfile) use it automatically.
    let decoder: JSONDecoder

    private init() {
        let url = URL(string: AppConfiguration.supabaseURL)!
        let key = AppConfiguration.supabaseAnonKey

        if key.isEmpty {
            print("[SupabaseService] WARNING: Supabase anon key is empty. API calls will fail.")
        }

        // Build decoder first so it can be registered with the Supabase client.
        // Without this, PostgREST `.value` uses the default JSONDecoder which
        // cannot parse PostgreSQL microsecond timestamps, causing dataCorrupted errors.
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        d.dateDecodingStrategy = PostgresDateDecoding.strategy
        decoder = d

        client = SupabaseClient(
            supabaseURL: url,
            supabaseKey: key,
            options: SupabaseClientOptions(
                db: .init(encoder: JSONEncoder(), decoder: d)
            )
        )
    }
}

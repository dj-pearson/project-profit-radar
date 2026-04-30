import Foundation
import os
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

    /// Dedicated edge function client targeting `functions.brikly.net`.
    /// `client.functions` would route via `<supabaseURL>/functions/v1/...`
    /// (i.e. api.brikly.net), bypassing the dedicated edge function container.
    let functions: EdgeFunctionsService

    private init() {
        let url = URL(string: AppConfiguration.supabaseURL)!
        let key = AppConfiguration.supabaseAnonKey

        if key.isEmpty {
            Loggers.services.fault("Supabase anon key is empty. API calls will fail.")
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

        functions = EdgeFunctionsService.shared
    }
}

// MARK: - Edge Functions

/// HTTP client that targets the dedicated edge function container.
///
/// Self-hosted Brikly exposes edge functions at `functions.brikly.net`. The
/// SupabaseClient's built-in `functions` property is hardcoded to
/// `<supabaseURL>/functions/v1/...`, which would route through the Kong
/// gateway at api.brikly.net instead of the dedicated container.
///
/// Usage:
/// ```
/// let result: MyResponse = try await SupabaseService.shared.functions
///     .invoke("send-email", body: ["to": "user@example.com"])
/// ```
final class EdgeFunctionsService: @unchecked Sendable {
    static let shared = EdgeFunctionsService()

    enum EdgeFunctionError: LocalizedError {
        case httpError(status: Int, body: String)
        case invalidResponse

        var errorDescription: String? {
            switch self {
            case .httpError(let status, let body):
                return "Edge function failed (\(status)): \(body)"
            case .invalidResponse:
                return "Edge function returned an invalid response."
            }
        }
    }

    private let session: URLSession
    private let baseURL: URL
    private let anonKey: String

    init(
        baseURLString: String = AppConfiguration.edgeFunctionsURL,
        anonKey: String = AppConfiguration.supabaseAnonKey,
        session: URLSession = .shared
    ) {
        guard let url = URL(string: baseURLString) else {
            fatalError("[EdgeFunctionsService] Invalid edge function URL: \(baseURLString)")
        }
        self.baseURL = url
        self.anonKey = anonKey
        self.session = session
    }

    /// Invoke an edge function and decode the response into `T`.
    /// The auth bearer is the active user's JWT when signed in, otherwise the anon key.
    @discardableResult
    func invoke<T: Decodable>(
        _ name: String,
        body: (any Encodable)? = nil,
        method: String = "POST",
        as _: T.Type = T.self
    ) async throws -> T {
        let request = try await buildRequest(name: name, body: body, method: method)
        let (data, response) = try await session.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw EdgeFunctionError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? "<binary \(data.count) bytes>"
            throw EdgeFunctionError.httpError(status: http.statusCode, body: body)
        }

        if T.self == EmptyResponse.self {
            return EmptyResponse() as! T
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = PostgresDateDecoding.strategy
        return try decoder.decode(T.self, from: data)
    }

    /// Invoke an edge function whose response body you don't need.
    func invoke(
        _ name: String,
        body: (any Encodable)? = nil,
        method: String = "POST"
    ) async throws {
        _ = try await invoke(name, body: body, method: method, as: EmptyResponse.self)
    }

    private func buildRequest(name: String, body: (any Encodable)?, method: String) async throws -> URLRequest {
        var request = URLRequest(url: baseURL.appendingPathComponent(name))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")

        let bearer = await Self.currentAccessToken() ?? anonKey
        request.setValue("Bearer \(bearer)", forHTTPHeaderField: "Authorization")

        if let body {
            let encoder = JSONEncoder()
            encoder.keyEncodingStrategy = .convertToSnakeCase
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }
        return request
    }

    @MainActor
    private static func currentAccessToken() async -> String? {
        try? await SupabaseService.shared.client.auth.session.accessToken
    }
}

/// Sentinel for edge functions whose response body is not needed.
struct EmptyResponse: Decodable {
    init() {}
}

private struct AnyEncodable: Encodable {
    let value: any Encodable
    init(_ value: any Encodable) { self.value = value }
    func encode(to encoder: Encoder) throws { try value.encode(to: encoder) }
}

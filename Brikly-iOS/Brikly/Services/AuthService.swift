import Foundation
import Supabase
import Auth

actor AuthService {
    private let client = SupabaseService.shared.client
    private let decoder = SupabaseService.shared.decoder

    /// Sign in with email and password.
    func signIn(email: String, password: String) async throws -> UserProfile {
        let session = try await client.auth.signIn(email: email, password: password)
        return try await fetchProfile(userId: session.user.id.uuidString)
    }

    /// Sign in with an Apple identity token. `nonce` is the raw (unhashed) nonce
    /// — Apple receives the SHA-256 hash, the unhashed value is sent to Supabase
    /// so the backend can verify the signed JWT contains the matching hash.
    func signInWithApple(idToken: String, nonce: String) async throws -> UserProfile {
        let session = try await client.auth.signInWithIdToken(
            credentials: OpenIDConnectCredentials(
                provider: .apple,
                idToken: idToken,
                nonce: nonce
            )
        )
        return try await fetchProfile(userId: session.user.id.uuidString)
    }

    /// Restore session and fetch the user profile.
    func restoreSession() async throws -> UserProfile {
        let session = try await client.auth.session
        return try await fetchProfile(userId: session.user.id.uuidString)
    }

    /// Sign out.
    func signOut() async throws {
        try await client.auth.signOut()
    }

    /// Fetch the `user_profiles` row for the authenticated user.
    private func fetchProfile(userId: String) async throws -> UserProfile {
        do {
            let response: [UserProfile] = try await client
                .from("user_profiles")
                .select()
                .eq("id", value: userId)
                .limit(1)
                .execute()
                .value

            guard let profile = response.first else {
                throw AuthError.profileNotFound
            }
            return profile
        } catch let decodingError as DecodingError {
            // Log full decoding details to help diagnose field/type mismatches.
            print("[AuthService] fetchProfile decoding error: \(DecodingErrorHelper.describe(decodingError))")
            throw decodingError
        }
    }

    enum AuthError: LocalizedError {
        case profileNotFound

        var errorDescription: String? {
            switch self {
            case .profileNotFound:
                return "User profile not found. Contact your administrator."
            }
        }
    }
}

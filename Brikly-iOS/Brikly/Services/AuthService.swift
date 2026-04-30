import Foundation
import os
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
    ///
    /// Apple ONLY returns `email` / `firstName` / `lastName` on the *first*
    /// sign-in for a given Apple ID. Pass them through so the row can be
    /// backfilled on initial account creation; on subsequent sign-ins they
    /// will be `nil` and existing data is preserved.
    func signInWithApple(
        idToken: String,
        nonce: String,
        email: String? = nil,
        firstName: String? = nil,
        lastName: String? = nil
    ) async throws -> UserProfile {
        let session = try await client.auth.signInWithIdToken(
            credentials: OpenIDConnectCredentials(
                provider: .apple,
                idToken: idToken,
                nonce: nonce
            )
        )

        let userId = session.user.id.uuidString
        var profile = try await fetchProfile(userId: userId)

        // Backfill any missing identity fields Apple just provided. We never
        // overwrite values that are already populated — Apple only sends these
        // on first sign-in, so the existing row is the source of truth after that.
        let needsBackfill = (profile.firstName?.isEmpty ?? true) && firstName != nil
            || (profile.lastName?.isEmpty ?? true) && lastName != nil
            || (profile.email.isEmpty && email != nil)

        if needsBackfill {
            do {
                profile = try await backfillIdentity(
                    userId: userId,
                    profile: profile,
                    email: email,
                    firstName: firstName,
                    lastName: lastName
                )
            } catch {
                // Backfill is best-effort — don't block sign-in if it fails.
                Loggers.auth.error("Apple identity backfill failed: \(error.localizedDescription, privacy: .public)")
            }
        }

        return profile
    }

    private struct IdentityBackfill: Encodable {
        var email: String?
        var firstName: String?
        var lastName: String?

        enum CodingKeys: String, CodingKey {
            case email
            case firstName = "first_name"
            case lastName = "last_name"
        }
    }

    private func backfillIdentity(
        userId: String,
        profile: UserProfile,
        email: String?,
        firstName: String?,
        lastName: String?
    ) async throws -> UserProfile {
        let payload = IdentityBackfill(
            email: (profile.email.isEmpty ? email : nil)?.nilIfEmpty,
            firstName: (profile.firstName?.isEmpty ?? true ? firstName : nil)?.nilIfEmpty,
            lastName: (profile.lastName?.isEmpty ?? true ? lastName : nil)?.nilIfEmpty
        )

        // If every field would be nil there's nothing to send.
        if payload.email == nil && payload.firstName == nil && payload.lastName == nil {
            return profile
        }

        let response: [UserProfile] = try await client
            .from("user_profiles")
            .update(payload)
            .eq("id", value: userId)
            .select()
            .execute()
            .value

        return response.first ?? profile
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

    /// Send a password-reset email. The email contains a recovery link that
    /// opens the web app where the user can set a new password.
    func sendPasswordReset(email: String) async throws {
        try await client.auth.resetPasswordForEmail(email)
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
            Loggers.auth.error("fetchProfile decoding error: \(DecodingErrorHelper.describe(decodingError), privacy: .public)")
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

private extension String {
    /// Returns nil when the trimmed string is empty — keeps optional chains
    /// from passing `""` through to PostgREST updates.
    var nilIfEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

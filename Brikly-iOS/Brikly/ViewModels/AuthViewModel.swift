import Foundation
import Observation
import os

@Observable
@MainActor
final class AuthViewModel {
    // MARK: - Published state

    var isAuthenticated = false
    var isLoading = false
    var userProfile: UserProfile?
    var errorMessage: String?

    // MARK: - Login form fields

    var email = ""
    var password = ""

    // MARK: - Derived

    var companyId: String? { userProfile?.companyId }
    var siteId: String? { userProfile?.siteId }
    var userRole: String { userProfile?.role ?? "" }

    // MARK: - Private

    private let authService = AuthService()

    // MARK: - Actions

    /// Attempt to restore a persisted session on launch.
    func restoreSession() async {
        isLoading = true
        errorMessage = nil
        do {
            let profile = try await authService.restoreSession()
            userProfile = profile
            isAuthenticated = true
            CrashReporter.setUser(id: profile.id, email: profile.email)
        } catch {
            // No session – user needs to log in.
            isAuthenticated = false
        }
        isLoading = false
    }

    /// Sign in with email and password.
    func signIn() async {
        guard !email.trimmingCharacters(in: .whitespaces).isEmpty,
              !password.isEmpty else {
            errorMessage = "Enter your email and password."
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            let profile = try await authService.signIn(
                email: email.trimmingCharacters(in: .whitespaces).lowercased(),
                password: password
            )
            userProfile = profile
            isAuthenticated = true
            CrashReporter.setUser(id: profile.id, email: profile.email)
            // Clear form
            email = ""
            password = ""
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    /// Exchange an Apple identity token for a Supabase session.
    /// `email` / `firstName` / `lastName` are only populated on first sign-in;
    /// they're forwarded so the user_profiles row can be backfilled.
    func signInWithApple(
        idToken: String,
        nonce: String,
        email: String? = nil,
        firstName: String? = nil,
        lastName: String? = nil
    ) async {
        isLoading = true
        errorMessage = nil

        do {
            let profile = try await authService.signInWithApple(
                idToken: idToken,
                nonce: nonce,
                email: email,
                firstName: firstName,
                lastName: lastName
            )
            userProfile = profile
            isAuthenticated = true
            CrashReporter.setUser(id: profile.id, email: profile.email)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    /// Send a password-reset email. Returns true on success so the view can
    /// show a confirmation alert.
    @discardableResult
    func sendPasswordReset(email: String) async -> Bool {
        let trimmed = email.trimmingCharacters(in: .whitespaces).lowercased()
        guard !trimmed.isEmpty, trimmed.contains("@") else {
            errorMessage = "Enter a valid email address first."
            return false
        }

        do {
            try await authService.sendPasswordReset(email: trimmed)
            return true
        } catch {
            Loggers.auth.error("Password reset failed: \(error.localizedDescription, privacy: .public)")
            errorMessage = "Could not send reset email. Please try again."
            return false
        }
    }

    /// Sign out.
    func signOut() async {
        do {
            try await authService.signOut()
        } catch {
            Loggers.auth.error("Sign-out error: \(error.localizedDescription, privacy: .public)")
        }
        userProfile = nil
        isAuthenticated = false
        CrashReporter.setUser(id: nil, email: nil)
    }
}

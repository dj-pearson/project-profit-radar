import Foundation
import Observation

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
            // Clear form
            email = ""
            password = ""
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    /// Exchange an Apple identity token for a Supabase session.
    func signInWithApple(idToken: String, nonce: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let profile = try await authService.signInWithApple(idToken: idToken, nonce: nonce)
            userProfile = profile
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    /// Sign out.
    func signOut() async {
        do {
            try await authService.signOut()
        } catch {
            print("Sign-out error: \(error)")
        }
        userProfile = nil
        isAuthenticated = false
    }
}

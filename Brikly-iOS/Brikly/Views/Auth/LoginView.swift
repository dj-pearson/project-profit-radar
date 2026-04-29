import SwiftUI
import AuthenticationServices
import CryptoKit

struct LoginView: View {
    @Environment(AuthViewModel.self) private var auth

    /// Raw (unhashed) nonce captured at request-creation time and replayed to
    /// Supabase after Apple returns the signed identity token.
    @State private var currentNonce: String?

    var body: some View {
        @Bindable var auth = auth

        NavigationStack {
            ScrollView {
                VStack(spacing: 32) {
                    // Logo
                    VStack(spacing: 8) {
                        Image(systemName: "building.2.fill")
                            .font(.system(size: 56))
                            .foregroundStyle(.accent)
                        Text("Brikly")
                            .font(.largeTitle.bold())
                        Text("Construction Management")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 60)

                    // Email / Password form
                    VStack(spacing: 16) {
                        TextField("Email", text: $auth.email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                            .padding()
                            .background(.fill.tertiary)
                            .clipShape(RoundedRectangle(cornerRadius: 10))

                        SecureField("Password", text: $auth.password)
                            .textContentType(.password)
                            .padding()
                            .background(.fill.tertiary)
                            .clipShape(RoundedRectangle(cornerRadius: 10))

                        if let error = auth.errorMessage {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.red)
                                .multilineTextAlignment(.center)
                        }

                        Button {
                            Task { await auth.signIn() }
                        } label: {
                            Group {
                                if auth.isLoading {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Text("Sign In")
                                        .fontWeight(.semibold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(.accent)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                        .disabled(auth.isLoading)
                    }
                    .padding(.horizontal, 24)

                    // Divider
                    HStack {
                        Rectangle().frame(height: 1).foregroundStyle(.separator)
                        Text("or")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Rectangle().frame(height: 1).foregroundStyle(.separator)
                    }
                    .padding(.horizontal, 24)

                    // Apple Sign-In
                    SignInWithAppleButton(.signIn) { request in
                        let raw = AppleSignInNonce.makeRaw()
                        currentNonce = raw
                        request.requestedScopes = [.email, .fullName]
                        request.nonce = AppleSignInNonce.sha256(raw)
                    } onCompletion: { result in
                        handleAppleResult(result)
                    }
                    .signInWithAppleButtonStyle(.black)
                    .frame(height: 50)
                    .padding(.horizontal, 24)

                    Spacer(minLength: 40)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func handleAppleResult(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let identityTokenData = credential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8) else {
                auth.errorMessage = "Apple Sign-In returned an unexpected response."
                return
            }
            guard let nonce = currentNonce else {
                auth.errorMessage = "Apple Sign-In nonce missing. Please try again."
                return
            }
            currentNonce = nil
            Task {
                await auth.signInWithApple(idToken: identityToken, nonce: nonce)
            }
        case .failure(let error):
            // The user canceling produces ASAuthorizationError.canceled — silently ignore that.
            if let asError = error as? ASAuthorizationError, asError.code == .canceled {
                return
            }
            auth.errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Apple Sign-In nonce helpers

private enum AppleSignInNonce {
    /// Random URL-safe nonce. Sent (unhashed) to Supabase so the backend can
    /// verify the signed Apple JWT contains the matching SHA-256 digest.
    static func makeRaw(length: Int = 32) -> String {
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remaining = length
        while remaining > 0 {
            var bytes = [UInt8](repeating: 0, count: 16)
            let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
            precondition(status == errSecSuccess, "Failed to generate secure random bytes")
            for byte in bytes where remaining > 0 {
                if byte < charset.count {
                    result.append(charset[Int(byte)])
                    remaining -= 1
                }
            }
        }
        return result
    }

    /// Hex-encoded SHA-256 of the input — what Apple expects in `request.nonce`.
    static func sha256(_ input: String) -> String {
        let digest = SHA256.hash(data: Data(input.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

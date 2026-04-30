import SwiftUI
import AuthenticationServices
import CryptoKit
import os

struct LoginView: View {
    @Environment(AuthViewModel.self) private var auth

    /// Raw (unhashed) nonce captured at request-creation time and replayed to
    /// Supabase after Apple returns the signed identity token.
    @State private var currentNonce: String?

    @State private var showResetSent = false
    @State private var isSendingReset = false

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
                            .accessibilityHidden(true)
                        Text("Brikly")
                            .font(.largeTitle.bold())
                        Text("Construction Management")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 60)
                    .accessibilityElement(children: .combine)

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

                        Button {
                            Task { await sendPasswordReset() }
                        } label: {
                            if isSendingReset {
                                ProgressView()
                            } else {
                                Text("Forgot Password?")
                                    .font(.footnote)
                            }
                        }
                        .disabled(auth.isLoading || isSendingReset)
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
            .alert("Password reset email sent", isPresented: $showResetSent) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("If an account exists for that email, you'll receive instructions to reset your password shortly.")
            }
        }
    }

    private func sendPasswordReset() async {
        isSendingReset = true
        defer { isSendingReset = false }
        let success = await auth.sendPasswordReset(email: auth.email)
        if success {
            showResetSent = true
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

            // Apple only returns email + fullName on FIRST sign-in for an Apple ID;
            // capture them so we can backfill the user_profiles row.
            let email = credential.email
            let firstName = credential.fullName?.givenName
            let lastName = credential.fullName?.familyName

            // Apple's anti-fraud signal — `.likelyReal` means Apple believes this
            // is a real human; `.unknown` is the default for first-time sign-ins
            // or when the account is too new to score; `.unsupported` is older
            // devices. Log for now so we can correlate with abuse signals; a
            // future backend hook can persist this on the user_profiles row.
            Loggers.auth.info("Apple sign-in realUserStatus: \(realUserStatusLabel(credential.realUserStatus), privacy: .public)")

            Task {
                await auth.signInWithApple(
                    idToken: identityToken,
                    nonce: nonce,
                    email: email,
                    firstName: firstName,
                    lastName: lastName
                )
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

private func realUserStatusLabel(_ status: ASUserDetectionStatus) -> String {
    switch status {
    case .likelyReal: return "likelyReal"
    case .unknown: return "unknown"
    case .unsupported: return "unsupported"
    @unknown default: return "unrecognized(\(status.rawValue))"
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

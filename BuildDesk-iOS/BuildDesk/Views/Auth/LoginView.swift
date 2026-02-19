import SwiftUI
import AuthenticationServices

struct LoginView: View {
    @Environment(AuthViewModel.self) private var auth

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
                        Text("BuildDesk")
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
                        request.requestedScopes = [.email, .fullName]
                    } onCompletion: { result in
                        switch result {
                        case .success(let auth):
                            // TODO: Exchange Apple credential with Supabase
                            print("Apple sign-in success: \(auth)")
                        case .failure(let error):
                            print("Apple sign-in error: \(error)")
                        }
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
}

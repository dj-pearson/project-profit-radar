import SwiftUI

struct ContentView: View {
    @Environment(AuthViewModel.self) private var auth

    var body: some View {
        Group {
            if auth.isLoading && !auth.isAuthenticated {
                // Splash / session restore
                VStack(spacing: 16) {
                    Image(systemName: "building.2.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(.accent)
                    Text("Brikly")
                        .font(.largeTitle.bold())
                    ProgressView()
                }
            } else if auth.isAuthenticated {
                ProjectListView()
            } else {
                LoginView()
            }
        }
        .task {
            await auth.restoreSession()
        }
    }
}

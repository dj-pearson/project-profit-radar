import SwiftUI

struct ContentView: View {
    @Environment(AuthViewModel.self) private var auth
    @Environment(NetworkMonitor.self) private var network

    var body: some View {
        ZStack(alignment: .top) {
            Group {
                if auth.isLoading && !auth.isAuthenticated {
                    // Splash / session restore
                    VStack(spacing: 16) {
                        Image(systemName: "building.2.fill")
                            .font(.system(size: 64))
                            .foregroundStyle(.accent)
                            .accessibilityHidden(true)
                        Text("Brikly")
                            .font(.largeTitle.bold())
                        ProgressView()
                    }
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("Brikly is loading")
                } else if auth.isAuthenticated {
                    ProjectListView()
                } else {
                    LoginView()
                }
            }

            if !network.isOnline {
                OfflineBanner()
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: network.isOnline)
        .task {
            await auth.restoreSession()
        }
    }
}

/// Persistent banner shown across the app when reachability flips off.
/// Mutations made while this is visible are queued in `OfflineStore` and
/// replayed by `SyncEngine` once connectivity returns.
private struct OfflineBanner: View {
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "wifi.slash")
                .accessibilityHidden(true)
            Text("Offline — changes will sync when you reconnect")
                .font(.footnote.weight(.medium))
                .lineLimit(2)
            Spacer(minLength: 0)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity)
        .background(Color.brandWarning)
        .accessibilityElement(children: .combine)
    }
}

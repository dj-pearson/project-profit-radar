import SwiftUI
import os

@main
struct BriklyApp: App {
    @State private var authViewModel = AuthViewModel()
    @State private var networkMonitor = NetworkMonitor.shared

    init() {
        CrashReporter.start()
        // Start reachability tracking right away so the offline banner is
        // accurate from the first frame; the SyncEngine drain hooks off the
        // monitor's online-transition callback.
        Task { @MainActor in
            NetworkMonitor.shared.start()
            await SyncEngine.shared.drain()
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authViewModel)
                .environment(networkMonitor)
                .modelContainer(OfflineStore.shared.container)
                .onOpenURL { url in
                    Task { await Self.handleIncoming(url: url) }
                }
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    if let url = activity.webpageURL {
                        Task { await Self.handleIncoming(url: url) }
                    }
                }
        }
    }

    /// Handle a URL delivered via custom scheme or universal link.
    /// Currently the app has no in-app deep-link routing, so we only attempt
    /// to absorb Supabase auth callbacks (token fragments). Other URLs are
    /// logged and ignored — they must NOT crash the app.
    @MainActor
    private static func handleIncoming(url: URL) async {
        Loggers.app.info("Received URL: \(url.absoluteString, privacy: .public)")

        // If the URL contains an OAuth callback fragment (#access_token=...),
        // hand it to Supabase auth so a session is created. No-op otherwise.
        let fragment = url.fragment ?? ""
        let query = url.query ?? ""
        let looksLikeAuthCallback = fragment.contains("access_token=")
            || fragment.contains("error=")
            || query.contains("code=")
        guard looksLikeAuthCallback else { return }

        do {
            try await SupabaseService.shared.client.auth.session(from: url)
            Loggers.app.info("Absorbed auth callback URL")
        } catch {
            Loggers.app.error("Failed to handle auth callback: \(error.localizedDescription, privacy: .public)")
        }
    }
}

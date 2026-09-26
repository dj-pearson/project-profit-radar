import Observation
import Supabase
import UIKit
import UserNotifications

/// APNs registration and notification taps.
///
/// Permission is asked for from the Alerts tab, never at launch. Once granted,
/// every launch re-registers, because APNs can rotate the token; the token is
/// stored server-side through `register_device_push_token`, and the server
/// (`deliver-apns`) pushes each new `real_time_notifications` row to it.
@MainActor
@Observable
final class PushNotificationService: NSObject, UNUserNotificationCenterDelegate {
    static let shared = PushNotificationService()

    private(set) var authorization: UNAuthorizationStatus = .notDetermined
    /// Set when the user taps a notification; the tab bar opens Alerts.
    var openAlertsRequested = false

    // UserDefaults key; a contract like the others (don't rename).
    @ObservationIgnored private let tokenKey = "brikly.push.deviceToken"

    private override init() {
        super.init()
    }

    /// Call once at launch.
    func configure() {
        UNUserNotificationCenter.current().delegate = self
        Task { await refreshAuthorization() }
    }

    func refreshAuthorization() async {
        authorization = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }

    /// Ask for permission (from a button the user tapped) and register.
    func requestPermission() async {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .sound, .badge])
            await refreshAuthorization()
            if granted { UIApplication.shared.registerForRemoteNotifications() }
        } catch {
            Loggers.app.error("Notification permission failed: \(error.localizedDescription, privacy: .public)")
        }
    }

    /// After sign-in: re-register if permission was already granted.
    func registerIfAuthorized() async {
        await refreshAuthorization()
        if authorization == .authorized || authorization == .provisional {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    func didRegister(deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        UserDefaults.standard.set(token, forKey: tokenKey)
        Task { await upload(token: token) }
    }

    private func upload(token: String) async {
        struct Params: Encodable, Sendable {
            let pToken: String
            let pEnvironment: String
            let pAppVersion: String?
            enum CodingKeys: String, CodingKey {
                case pToken = "p_token"
                case pEnvironment = "p_environment"
                case pAppVersion = "p_app_version"
            }
        }
        #if DEBUG
        let environment = "sandbox"      // Xcode builds use the APNs sandbox
        #else
        let environment = "production"   // TestFlight and App Store
        #endif
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
        do {
            try await SupabaseService.shared.client
                .rpc("register_device_push_token", params: Params(pToken: token, pEnvironment: environment, pAppVersion: version))
                .execute()
        } catch {
            // Not signed in yet, or offline: the next launch registers again.
            Loggers.app.error("Push token not saved: \(error.localizedDescription, privacy: .public)")
        }
    }

    /// Before sign-out, so the next person on this phone doesn't get this
    /// user's notifications. Needs the session still valid.
    func unregister() async {
        guard let token = UserDefaults.standard.string(forKey: tokenKey) else { return }
        _ = try? await SupabaseService.shared.client
            .from("device_push_tokens")
            .delete()
            .eq("token", value: token)
            .execute()
    }

    // MARK: - UNUserNotificationCenterDelegate

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .list, .sound]
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        await MainActor.run { self.openAlertsRequested = true }
    }
}

/// UIKit hooks SwiftUI doesn't expose: the APNs token callbacks.
final class BriklyAppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        PushNotificationService.shared.configure()
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        PushNotificationService.shared.didRegister(deviceToken: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        Loggers.app.error("APNs registration failed: \(error.localizedDescription, privacy: .public)")
    }
}

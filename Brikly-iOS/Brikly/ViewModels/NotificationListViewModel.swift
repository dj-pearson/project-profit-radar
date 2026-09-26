import Foundation
import Observation

@Observable
@MainActor
final class NotificationListViewModel {
    var notifications: [AppNotification] = []
    var isLoading = false
    var errorMessage: String?

    private let service = NotificationService()

    var unreadCount: Int { notifications.filter(\.isUnread).count }

    func load(recipientId: String) async {
        isLoading = notifications.isEmpty
        errorMessage = nil
        defer { isLoading = false }
        do {
            notifications = try await service.fetch(recipientId: recipientId)
        } catch {
            if notifications.isEmpty {
                errorMessage = DecodingErrorHelper.handle(error, context: "Notifications")
            }
        }
    }

    func markRead(_ notification: AppNotification, recipientId: String) async {
        guard notification.isUnread else { return }
        setRead(ids: [notification.id])
        try? await service.markRead(id: notification.id, recipientId: recipientId)
    }

    func markAllRead(recipientId: String) async {
        setRead(ids: Set(notifications.filter(\.isUnread).map(\.id)))
        try? await service.markAllRead(recipientId: recipientId)
    }

    private func setRead(ids: Set<String>) {
        let now = Date()
        for index in notifications.indices where ids.contains(notifications[index].id) {
            notifications[index].readAt = now
        }
    }
}

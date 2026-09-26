import Foundation

/// A row in `real_time_notifications`, the table the web bell reads
/// (`useSimpleNotifications.ts`). RLS limits reads to the recipient.
struct AppNotification: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let recipientId: String
    var senderId: String?
    var type: String
    var title: String
    var message: String
    var priority: String?
    var readAt: Date?
    let createdAt: Date

    var isUnread: Bool { readAt == nil }

    var icon: String {
        switch type {
        case "project_update": "building.2"
        case "approval_request": "checkmark.seal"
        case "safety_incident": "cross.case"
        case "task_assignment": "checklist"
        case "budget_alert": "dollarsign.circle"
        case "timeline_change": "calendar.badge.exclamationmark"
        case "message": "bubble.left"
        default: "bell"
        }
    }
}

struct NotificationReadUpdate: Codable, Sendable {
    let readAt: String

    enum CodingKeys: String, CodingKey {
        case readAt = "read_at"
    }
}

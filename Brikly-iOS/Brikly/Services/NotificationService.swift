import Foundation
import Supabase

actor NotificationService {
    private let client = SupabaseService.shared.client

    func fetch(recipientId: String, limit: Int = 50) async throws -> [AppNotification] {
        try await client
            .from("real_time_notifications")
            .select("id, recipient_id, sender_id, type, title, message, priority, read_at, created_at")
            .eq("recipient_id", value: recipientId)
            .order("created_at", ascending: false)
            .limit(limit)
            .execute()
            .value
    }

    func markRead(id: String, recipientId: String) async throws {
        try await client
            .from("real_time_notifications")
            .update(NotificationReadUpdate(readAt: ISO8601DateFormatter().string(from: .now)))
            .eq("id", value: id)
            .eq("recipient_id", value: recipientId)
            .execute()
    }

    func markAllRead(recipientId: String) async throws {
        try await client
            .from("real_time_notifications")
            .update(NotificationReadUpdate(readAt: ISO8601DateFormatter().string(from: .now)))
            .eq("recipient_id", value: recipientId)
            .is("read_at", value: nil)
            .execute()
    }
}

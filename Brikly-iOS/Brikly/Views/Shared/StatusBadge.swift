import SwiftUI

struct StatusBadge: View {
    let status: String

    var body: some View {
        Text(displayText)
            .font(.caption2.weight(.medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(backgroundColor.opacity(0.15))
            .foregroundStyle(backgroundColor)
            .clipShape(Capsule())
    }

    private var displayText: String {
        status.replacingOccurrences(of: "_", with: " ").capitalized
    }

    private var backgroundColor: Color {
        switch status.lowercased() {
        case "active", "in_progress", "approved":
            .blue
        case "completed", "done", "available", "verified", "paid":
            .green
        case "planning", "pending", "draft", "maintenance", "open", "planned":
            .orange
        case "on_hold", "paused":
            .yellow
        case "blocked":
            .red
        case "cancelled", "rejected", "out_of_service", "closed":
            .gray
        case "urgent":
            .red
        default:
            .secondary
        }
    }
}

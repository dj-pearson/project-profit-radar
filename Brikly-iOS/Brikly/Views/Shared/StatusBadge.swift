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
        case "completed", "done":
            .green
        case "planning", "pending", "draft":
            .orange
        case "on_hold", "paused":
            .yellow
        case "blocked":
            .red
        case "cancelled", "rejected":
            .gray
        case "urgent":
            .red
        default:
            .secondary
        }
    }
}

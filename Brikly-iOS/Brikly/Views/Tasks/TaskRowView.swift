import SwiftUI

struct TaskRowView: View {
    let task: ProjectTask

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(task.name)
                    .font(.body.weight(.medium))
                Spacer()
                StatusBadge(status: task.status ?? "pending")
            }

            HStack(spacing: 12) {
                // Priority
                Label(task.displayPriority.label, systemImage: priorityIcon)
                    .font(.caption)
                    .foregroundStyle(priorityColor)

                // Due date
                if let due = task.dueDate {
                    Label(DateFormatting.short(due), systemImage: "calendar")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Completion
                if let pct = task.completionPercentage, pct > 0 {
                    Text("\(Int(pct))%")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var priorityIcon: String {
        switch task.displayPriority {
        case .urgent: "exclamationmark.triangle.fill"
        case .high: "arrow.up.circle.fill"
        case .medium: "minus.circle.fill"
        case .low: "arrow.down.circle.fill"
        case .unknown: "questionmark.circle"
        }
    }

    private var priorityColor: Color {
        switch task.displayPriority {
        case .urgent: .red
        case .high: .orange
        case .medium: .blue
        case .low: .green
        case .unknown: .gray
        }
    }
}

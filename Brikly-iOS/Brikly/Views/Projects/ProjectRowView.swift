import SwiftUI

struct ProjectRowView: View {
    let project: Project

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Name + Status
            HStack {
                Text(project.name)
                    .font(.headline)
                Spacer()
                StatusBadge(status: project.status ?? "unknown")
            }

            // Client
            if let client = project.clientName, !client.isEmpty {
                Label(client, systemImage: "person.fill")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // Budget + Completion
            HStack {
                if project.effectiveBudget > 0 {
                    CurrencyText(amount: project.effectiveBudget)
                        .font(.subheadline.weight(.medium))
                }

                Spacer()

                if let pct = project.completionPercentage {
                    HStack(spacing: 6) {
                        ProgressView(value: pct / 100)
                            .frame(width: 60)
                        Text("\(Int(pct))%")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

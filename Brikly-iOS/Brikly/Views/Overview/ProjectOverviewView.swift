import SwiftUI

struct ProjectOverviewView: View {
    let project: Project

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Stat cards row
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                ], spacing: 12) {
                    StatCard(
                        title: "Completion",
                        value: "\(Int(project.completionPercentage ?? 0))%",
                        icon: "chart.pie.fill",
                        color: .blue
                    )
                    StatCard(
                        title: "Budget",
                        value: CurrencyFormatter.format(project.effectiveBudget),
                        icon: "dollarsign.circle.fill",
                        color: .green
                    )
                    StatCard(
                        title: "Est. Hours",
                        value: project.estimatedHours.map { "\(Int($0))h" } ?? "—",
                        icon: "clock.fill",
                        color: .orange
                    )
                    StatCard(
                        title: "Actual Hours",
                        value: project.actualHours.map { "\(Int($0))h" } ?? "—",
                        icon: "clock.badge.checkmark.fill",
                        color: .purple
                    )
                }
                .padding(.horizontal)

                // Details sections
                VStack(alignment: .leading, spacing: 16) {
                    // Client info
                    if let client = project.clientName, !client.isEmpty {
                        DetailSection(title: "Client") {
                            DetailRow(label: "Name", value: client)
                            if let email = project.clientEmail, !email.isEmpty {
                                DetailRow(label: "Email", value: email)
                            }
                        }
                    }

                    // Location
                    if let address = project.siteAddress, !address.isEmpty {
                        DetailSection(title: "Location") {
                            DetailRow(label: "Address", value: address)
                        }
                    }

                    // Timeline
                    DetailSection(title: "Timeline") {
                        DetailRow(label: "Start", value: DateFormatting.medium(project.startDate))
                        DetailRow(label: "End", value: DateFormatting.medium(project.endDate))
                        DetailRow(label: "Status", value: project.displayStatus.label)
                    }

                    // Description
                    if let desc = project.description, !desc.isEmpty {
                        DetailSection(title: "Description") {
                            Text(desc)
                                .font(.body)
                                .foregroundStyle(.secondary)
                        }
                    }

                    // Financial
                    if project.effectiveBudget > 0 || project.profitMargin != nil {
                        DetailSection(title: "Financial") {
                            DetailRow(label: "Budget", value: CurrencyFormatter.format(project.effectiveBudget))
                            if let margin = project.profitMargin {
                                DetailRow(label: "Profit Margin", value: String(format: "%.1f%%", margin))
                            }
                        }
                    }
                }
                .padding(.horizontal)
            }
            .padding(.vertical)
        }
    }
}

// MARK: - Sub-components

private struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(color)
                Spacer()
            }
            Text(value)
                .font(.title3.bold())
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(.fill.tertiary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

private struct DetailSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            content
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.fill.tertiary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

private struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
        }
        .font(.subheadline)
    }
}

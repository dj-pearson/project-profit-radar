import SwiftUI

struct DailyReportRowView: View {
    let report: DailyReport

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(report.date)
                    .font(.headline)
                Spacer()
                if let status = report.status {
                    StatusBadge(status: status)
                }
            }

            HStack(spacing: 16) {
                if let crew = report.crewCount {
                    Label("\(crew) crew", systemImage: "person.3.fill")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let weather = report.weatherConditions, !weather.isEmpty {
                    Label(weather, systemImage: "cloud.fill")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let temp = report.temperature {
                    Text("\(Int(temp))°")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if let work = report.workPerformed, !work.isEmpty {
                Text(work)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            // Indicators
            HStack(spacing: 8) {
                if let delays = report.delaysIssues, !delays.isEmpty {
                    Label("Delays", systemImage: "exclamationmark.triangle.fill")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                }
                if let safety = report.safetyIncidents, !safety.isEmpty {
                    Label("Safety", systemImage: "exclamationmark.shield.fill")
                        .font(.caption2)
                        .foregroundStyle(.red)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

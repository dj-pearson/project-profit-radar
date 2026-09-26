import SwiftUI

/// "Today's Assignments" section for the Time Clock form: check in on site,
/// check out when leaving. Hidden when the user has no assignment today.
struct CrewCheckInSection: View {
    let viewModel: CrewCheckInViewModel
    let projectName: (String) -> String
    let userId: String
    /// Called with the project id after a verified check-in.
    let onVerified: (String) -> Void

    var body: some View {
        if !viewModel.assignments.isEmpty {
            Section {
                ForEach(viewModel.assignments) { assignment in
                    row(assignment)
                }
                if let error = viewModel.errorMessage {
                    Label(error, systemImage: "location.slash")
                        .font(.footnote)
                        .foregroundStyle(Color.brandDanger)
                } else if let message = viewModel.message {
                    Label(message, systemImage: "checkmark.circle")
                        .font(.footnote)
                        .foregroundStyle(Color.brandSuccess)
                }
            } header: {
                Text("Today's Assignments")
            } footer: {
                Text("Check-in verifies you're at the site. It's separate from clocking in.")
            }
        }
    }

    private func row(_ assignment: CrewAssignment) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(projectName(assignment.projectId))
                    .font(.body.weight(.medium))
                    .lineLimit(1)
                Text(detail(assignment))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            Spacer()
            if viewModel.workingId == assignment.id {
                ProgressView()
            } else if assignment.isDone {
                Label("Done", systemImage: "checkmark")
                    .labelStyle(.titleOnly)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            } else if assignment.isCheckedIn {
                Button("Check Out") {
                    Task { await viewModel.checkOut(assignment, userId: userId) }
                }
                .buttonStyle(.bordered)
            } else {
                Button("Check In") {
                    Task {
                        if let projectId = await viewModel.checkIn(assignment, userId: userId) {
                            onVerified(projectId)
                        }
                    }
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .disabled(viewModel.workingId != nil && viewModel.workingId != assignment.id)
    }

    private func detail(_ assignment: CrewAssignment) -> String {
        var parts: [String] = []
        if let start = assignment.startTime, let end = assignment.endTime {
            parts.append("\(Self.clock(start))-\(Self.clock(end))")
        }
        if assignment.isCheckedIn, let at = assignment.gpsCheckinTimestamp {
            parts.append("On site since \(at.formatted(date: .omitted, time: .shortened))")
        } else if let distance = assignment.distanceFromSite, assignment.gpsCheckinVerified == false {
            parts.append("Last try \(Int(distance)) m away")
        }
        if let location = assignment.location, !location.isEmpty { parts.append(location) }
        return parts.isEmpty ? assignment.status.replacingOccurrences(of: "_", with: " ").capitalized : parts.joined(separator: " · ")
    }

    /// "07:00:00" or a full timestamp to "07:00".
    private static func clock(_ value: String) -> String {
        if let t = value.firstIndex(of: "T") {
            return String(value[value.index(after: t)...].prefix(5))
        }
        return String(value.prefix(5))
    }
}

/// Crew on site today for one project, from `crew_presence_dashboard`.
struct CrewPresenceView: View {
    let projectId: String

    @State private var crew: [CrewPresence] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    private let service = CrewService()

    var body: some View {
        Group {
            if isLoading {
                LoadingView(message: "Loading crew...")
            } else if let errorMessage, crew.isEmpty {
                ErrorView(message: errorMessage) { await load() }
            } else if crew.isEmpty {
                EmptyStateView(icon: "person.3", title: "No Crew Scheduled", message: "Nobody is assigned to this project today.")
            } else {
                List {
                    let onSite = crew.filter { $0.isOnsite == true }
                    Section("On Site (\(onSite.count))") {
                        ForEach(onSite) { member in row(member) }
                    }
                    let others = crew.filter { $0.isOnsite != true }
                    if !others.isEmpty {
                        Section("Not On Site") {
                            ForEach(others) { member in row(member) }
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .refreshable { await load() }
            }
        }
        .navigationTitle("Crew on Site")
        .task { await load() }
    }

    private func row(_ member: CrewPresence) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(member.crewMemberName?.trimmingCharacters(in: .whitespaces).isEmpty == false
                     ? member.crewMemberName! : "Crew member")
                    .font(.body.weight(.medium))
                if let role = member.crewMemberRole {
                    Text(role.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(member.presenceStatus ?? "Unknown")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(member.isOnsite == true ? Color.brandSuccess : .secondary)
                if member.isOnsite == true, let hours = member.hoursOnsite {
                    Text(String(format: "%.1f h", hours))
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    private func load() async {
        do {
            crew = try await service.presence(projectId: projectId, date: DateFormatting.localISODate(.now))
            errorMessage = nil
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "CrewPresence")
        }
        isLoading = false
    }
}

import SwiftUI

struct SafetyIncidentListView: View {
    let projectId: String
    let companyId: String

    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel = RecordListViewModel<SafetyIncident>(table: "safety_incidents", orderBy: "incident_date")
    @State private var showingForm = false

    var body: some View {
        VStack(spacing: 0) {
            RecordListContainer(
                isLoading: viewModel.isLoading,
                errorMessage: viewModel.errorMessage,
                isEmpty: viewModel.records.isEmpty,
                emptyIcon: "cross.case",
                emptyTitle: "No Incidents",
                emptyMessage: "Report injuries, near misses and property damage here, the same day they happen.",
                retry: { await viewModel.load(projectId: projectId) }
            ) {
                List(viewModel.records) { incident in
                    IncidentRowView(incident: incident)
                }
                .listStyle(.plain)
                .refreshable { await viewModel.load(projectId: projectId) }
            }
            SaveNoticeView(notice: viewModel.notice, error: viewModel.records.isEmpty ? nil : viewModel.errorMessage)
        }
        .navigationTitle("Safety")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showingForm = true } label: { Label("Report", systemImage: "plus") }
                    .accessibilityLabel("Report incident")
            }
        }
        .sheet(isPresented: $showingForm) {
            IncidentFormView(projectId: projectId, companyId: companyId, userId: auth.userProfile?.id) { incident in
                await viewModel.create(incident, offlineEntity: "safety_incident") != .failed
            }
        }
        .task { await viewModel.load(projectId: projectId) }
    }
}

private struct IncidentRowView: View {
    let incident: SafetyIncident

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(IncidentType(rawValue: incident.incidentType)?.label ?? incident.incidentType.capitalized)
                    .font(.body.weight(.medium))
                Spacer()
                Text(incident.severity.capitalized)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(severityColor)
            }
            Text(incident.description)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)
            HStack(spacing: 12) {
                Label(DateFormatting.displayDate(incident.incidentDate), systemImage: "calendar")
                if incident.oshaRecordable == true {
                    Text("OSHA recordable").fontWeight(.semibold)
                }
                if let status = incident.status {
                    StatusBadge(status: status)
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }

    private var severityColor: Color {
        switch incident.severity {
        case "severe", "fatality": .brandDanger
        case "moderate": .brandWarning
        default: .secondary
        }
    }
}

private struct IncidentFormView: View {
    let projectId: String
    let companyId: String
    let userId: String?
    let onSave: (NewSafetyIncident) async -> Bool

    @Environment(\.dismiss) private var dismiss
    @State private var type = IncidentType.nearMiss.rawValue
    @State private var severity = IncidentSeverity.minor.rawValue
    @State private var occurredAt = Date()
    @State private var description = ""
    @State private var location = ""
    @State private var injuredName = ""
    @State private var bodyPart = ""
    @State private var medicalAttention = false
    @State private var lostTime = false
    @State private var immediateActions = ""
    @State private var oshaRecordable = false
    @State private var isSaving = false
    @State private var failed = false

    private var involvesInjury: Bool { type == IncidentType.injury.rawValue }

    var body: some View {
        NavigationStack {
            Form {
                Section("What happened") {
                    Picker("Type", selection: $type) {
                        ForEach(IncidentType.allCases, id: \.rawValue) { Text($0.label).tag($0.rawValue) }
                    }
                    Picker("Severity", selection: $severity) {
                        ForEach(IncidentSeverity.allCases, id: \.rawValue) { Text($0.label).tag($0.rawValue) }
                    }
                    DatePicker("When", selection: $occurredAt, in: ...Date())
                    TextField("Where on site", text: $location)
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...8)
                }
                if involvesInjury {
                    Section("Injured person") {
                        TextField("Name", text: $injuredName)
                        TextField("Body part affected", text: $bodyPart)
                        Toggle("Medical attention required", isOn: $medicalAttention)
                        Toggle("Lost time", isOn: $lostTime)
                    }
                }
                Section("Response") {
                    TextField("Immediate actions taken", text: $immediateActions, axis: .vertical)
                        .lineLimit(2...6)
                    Toggle("OSHA recordable", isOn: $oshaRecordable)
                }
                if failed {
                    Section { Text("Couldn't save the report. Try again.").foregroundStyle(Color.brandDanger) }
                }
            }
            .navigationTitle("Report Incident")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Submit") { Task { await save() } }
                        .disabled(description.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        let incident = NewSafetyIncident(
            companyId: companyId,
            projectId: projectId,
            incidentDate: DateFormatting.localISODate(occurredAt),
            incidentTime: Self.timeFormatter.string(from: occurredAt),
            incidentType: type,
            severity: severity,
            description: description.trimmingCharacters(in: .whitespaces),
            location: location.isEmpty ? nil : location,
            injuredPersonName: involvesInjury && !injuredName.isEmpty ? injuredName : nil,
            bodyPartAffected: involvesInjury && !bodyPart.isEmpty ? bodyPart : nil,
            medicalAttentionRequired: involvesInjury && medicalAttention,
            lostTime: involvesInjury && lostTime,
            immediateActions: immediateActions.isEmpty ? nil : immediateActions,
            oshaRecordable: oshaRecordable,
            reportedBy: userId,
            createdBy: userId
        )
        if await onSave(incident) { dismiss() } else { failed = true }
    }

    /// "14:05", the `HH:mm` string the web form stores in `incident_time`.
    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()
}

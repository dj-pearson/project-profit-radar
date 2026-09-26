import SwiftUI

/// Log completed (or started) maintenance. First writer of
/// `equipment_maintenance_records` in the app; web only reads them.
struct MaintenanceFormView: View {
    let equipment: Equipment
    let userId: String?
    let onSave: (NewMaintenanceRecord) async -> Bool

    @Environment(\.dismiss) private var dismiss
    @State private var type = MaintenanceType.preventive.rawValue
    @State private var taskName = ""
    @State private var workPerformed = ""
    @State private var isComplete = true
    @State private var completedOn = Date()
    @State private var laborHours = ""
    @State private var laborCost = ""
    @State private var partsCost = ""
    @State private var vendor = ""
    @State private var hourMeter = ""
    @State private var condition = MaintenanceCondition.good.rawValue
    @State private var issues = ""
    @State private var followUp = false
    @State private var followUpDate = Calendar.current.date(byAdding: .day, value: 14, to: .now) ?? .now
    @State private var isSaving = false
    @State private var failed = false

    private func number(_ text: String) -> Double? {
        Double(text.replacingOccurrences(of: ",", with: ""))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Work") {
                    Picker("Type", selection: $type) {
                        ForEach(MaintenanceType.allCases, id: \.rawValue) { Text($0.label).tag($0.rawValue) }
                    }
                    TextField("Task (e.g. 250-hour service)", text: $taskName)
                    TextField("Work performed", text: $workPerformed, axis: .vertical)
                        .lineLimit(3...8)
                    Toggle("Completed", isOn: $isComplete)
                    if isComplete {
                        DatePicker("Completed on", selection: $completedOn, in: ...Date(), displayedComponents: .date)
                    }
                }
                Section("Readings") {
                    TextField("Hour meter", text: $hourMeter).keyboardType(.decimalPad)
                    TextField("Labor hours", text: $laborHours).keyboardType(.decimalPad)
                    Picker("Condition after", selection: $condition) {
                        ForEach(MaintenanceCondition.allCases, id: \.rawValue) { Text($0.label).tag($0.rawValue) }
                    }
                }
                Section("Cost") {
                    TextField("Labor cost", text: $laborCost).keyboardType(.decimalPad)
                    TextField("Parts cost", text: $partsCost).keyboardType(.decimalPad)
                    TextField("Vendor (if outside shop)", text: $vendor)
                }
                Section("Follow-up") {
                    TextField("Issues found", text: $issues, axis: .vertical).lineLimit(2...5)
                    Toggle("Needs follow-up", isOn: $followUp)
                    if followUp {
                        DatePicker("By", selection: $followUpDate, displayedComponents: .date)
                    }
                }
                if failed {
                    Section { Text("Couldn't save. Your role may not allow logging maintenance.").foregroundStyle(Color.brandDanger) }
                }
            }
            .navigationTitle("Log Maintenance")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(taskName.trimmingCharacters(in: .whitespaces).isEmpty
                                  || workPerformed.trimmingCharacters(in: .whitespaces).isEmpty
                                  || isSaving)
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        let labor = number(laborCost)
        let parts = number(partsCost)
        let total: Double? = (labor == nil && parts == nil) ? nil : (labor ?? 0) + (parts ?? 0)
        let record = NewMaintenanceRecord(
            equipmentId: equipment.id,
            companyId: equipment.companyId,
            maintenanceType: type,
            taskName: taskName.trimmingCharacters(in: .whitespaces),
            workPerformed: workPerformed.trimmingCharacters(in: .whitespaces),
            actualCompletionDate: isComplete ? DateFormatting.localISODate(completedOn) : nil,
            totalLaborHours: number(laborHours),
            laborCost: labor,
            partsCost: parts,
            totalCost: total,
            vendorName: vendor.isEmpty ? nil : vendor,
            conditionAfter: condition,
            hourMeterReading: number(hourMeter),
            issuesFound: issues.isEmpty ? nil : issues,
            followUpRequired: followUp,
            followUpDate: followUp ? DateFormatting.localISODate(followUpDate) : nil,
            performedBy: userId,
            createdBy: userId
        )
        if await onSave(record) { dismiss() } else { failed = true }
    }
}

/// Book equipment to a project for a date range (`equipment_assignments`).
struct AssignmentFormView: View {
    let equipment: Equipment
    let userId: String?
    let onSave: (NewEquipmentAssignment) async -> Bool

    @Environment(AuthViewModel.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var projects: [Project] = []
    @State private var projectId = ""
    @State private var start = Date()
    @State private var end = Calendar.current.date(byAdding: .day, value: 7, to: .now) ?? .now
    @State private var notes = ""
    @State private var isSaving = false
    @State private var failed = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Project") {
                    Picker("Project", selection: $projectId) {
                        Text("Select...").tag("")
                        ForEach(projects) { Text($0.name).tag($0.id) }
                    }
                }
                Section("Dates") {
                    DatePicker("From", selection: $start, displayedComponents: .date)
                    DatePicker("To", selection: $end, in: start..., displayedComponents: .date)
                }
                Section("Notes") {
                    TextField("Notes", text: $notes, axis: .vertical).lineLimit(2...4)
                }
                if failed {
                    Section { Text("Couldn't book it. Your role may not allow assigning equipment.").foregroundStyle(Color.brandDanger) }
                }
            }
            .navigationTitle("Assign \(equipment.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Assign") { Task { await save() } }
                        .disabled(projectId.isEmpty || isSaving)
                }
            }
            .task {
                let cached = OfflineStore.shared.cachedProjects(companyId: auth.companyId ?? "")
                projects = cached
                    .filter { $0.status == "active" || $0.status == "in_progress" || $0.status == "planning" }
                    .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        let today = Calendar.current.startOfDay(for: .now)
        let assignment = NewEquipmentAssignment(
            companyId: equipment.companyId,
            equipmentId: equipment.id,
            projectId: projectId,
            startDate: DateFormatting.localISODate(start),
            endDate: DateFormatting.localISODate(end),
            // Starting today or earlier means it's on the job now.
            assignmentStatus: start <= today.addingTimeInterval(86_399) ? "active" : "planned",
            notes: notes.isEmpty ? nil : notes,
            assignedBy: userId
        )
        if await onSave(assignment) { dismiss() } else { failed = true }
    }
}

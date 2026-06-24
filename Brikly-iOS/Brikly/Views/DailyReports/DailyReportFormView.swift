import SwiftUI

struct DailyReportFormView: View {
    let projectId: String
    let companyId: String
    let siteId: String
    var existing: DailyReport?
    let onSave: (NewDailyReport) async -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var date = Date()
    @State private var crewCount = ""
    @State private var weatherConditions = ""
    @State private var temperature = ""
    @State private var workPerformed = ""
    @State private var delaysIssues = ""
    @State private var safetyIncidents = ""
    @State private var nextDayPlan = ""
    @State private var isSaving = false

    private var isEditing: Bool { existing != nil }

    var body: some View {
        NavigationStack {
            Form {
                Section("Date & Crew") {
                    if !isEditing {
                        DatePicker("Report Date", selection: $date, displayedComponents: .date)
                    }
                    TextField("Crew Count", text: $crewCount)
                        .keyboardType(.numberPad)
                }

                Section("Weather") {
                    TextField("Conditions (e.g. Sunny, Rainy)", text: $weatherConditions)
                    TextField("Temperature (°F)", text: $temperature)
                        .keyboardType(.decimalPad)
                }

                Section("Work Summary") {
                    TextField("Work Performed", text: $workPerformed, axis: .vertical)
                        .lineLimit(3...8)
                }

                Section("Issues") {
                    TextField("Delays / Issues", text: $delaysIssues, axis: .vertical)
                        .lineLimit(2...5)
                    TextField("Safety Incidents", text: $safetyIncidents, axis: .vertical)
                        .lineLimit(2...5)
                }

                Section("Next Day") {
                    TextField("Plan for Tomorrow", text: $nextDayPlan, axis: .vertical)
                        .lineLimit(2...5)
                }
            }
            .navigationTitle(isEditing ? "Edit Report" : "New Report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isEditing ? "Save" : "Create") {
                        Task { await save() }
                    }
                    .disabled(isSaving)
                }
            }
            .onAppear { populateFromExisting() }
        }
    }

    private func populateFromExisting() {
        guard let r = existing else { return }
        crewCount = r.crewCount.map(String.init) ?? ""
        weatherConditions = r.weatherConditions ?? ""
        temperature = r.temperature.map { String(format: "%.0f", $0) } ?? ""
        workPerformed = r.workPerformed ?? ""
        delaysIssues = r.delaysIssues ?? ""
        safetyIncidents = r.safetyIncidents ?? ""
        nextDayPlan = r.nextDayPlan ?? ""
    }

    private func save() async {
        isSaving = true

        let report = NewDailyReport(
            projectId: projectId,
            siteId: siteId,
            companyId: companyId,
            date: isEditing ? (existing?.date ?? DateFormatting.isoDate(date)) : DateFormatting.isoDate(date),
            crewCount: Int(crewCount),
            weatherConditions: weatherConditions.isEmpty ? nil : weatherConditions,
            temperature: Double(temperature),
            workPerformed: workPerformed.isEmpty ? nil : workPerformed,
            delaysIssues: delaysIssues.isEmpty ? nil : delaysIssues,
            safetyIncidents: safetyIncidents.isEmpty ? nil : safetyIncidents,
            nextDayPlan: nextDayPlan.isEmpty ? nil : nextDayPlan
        )

        await onSave(report)
        isSaving = false
        dismiss()
    }
}

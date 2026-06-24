import SwiftUI

struct TaskFormView: View {
    let projectId: String
    let companyId: String
    let siteId: String
    var existing: ProjectTask?
    let onSave: (NewTask) async -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var description = ""
    @State private var status = "pending"
    @State private var priority = "medium"
    @State private var dueDate = Date()
    @State private var hasDueDate = false
    @State private var completionPercentage: Double = 0
    @State private var isSaving = false

    private var isEditing: Bool { existing != nil }

    var body: some View {
        NavigationStack {
            Form {
                Section("Details") {
                    TextField("Task Name", text: $name)
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Status & Priority") {
                    Picker("Status", selection: $status) {
                        Text("Pending").tag("pending")
                        Text("In Progress").tag("in_progress")
                        Text("Completed").tag("completed")
                        Text("Blocked").tag("blocked")
                    }

                    Picker("Priority", selection: $priority) {
                        Text("Low").tag("low")
                        Text("Medium").tag("medium")
                        Text("High").tag("high")
                        Text("Urgent").tag("urgent")
                    }
                }

                Section("Schedule") {
                    Toggle("Due Date", isOn: $hasDueDate)
                    if hasDueDate {
                        DatePicker("Due", selection: $dueDate, displayedComponents: .date)
                    }
                }

                Section("Progress") {
                    VStack(alignment: .leading) {
                        Text("Completion: \(Int(completionPercentage))%")
                        Slider(value: $completionPercentage, in: 0...100, step: 5)
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Task" : "New Task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isEditing ? "Save" : "Create") {
                        Task { await save() }
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
                }
            }
            .onAppear { populateFromExisting() }
        }
    }

    private func populateFromExisting() {
        guard let task = existing else { return }
        name = task.name
        description = task.description ?? ""
        status = task.status ?? "pending"
        priority = task.priority ?? "medium"
        completionPercentage = task.completionPercentage ?? 0
        if let due = task.dueDate {
            dueDate = due
            hasDueDate = true
        }
    }

    private func save() async {
        isSaving = true
        let dateString: String? = hasDueDate
            ? DateFormatting.isoDate(dueDate)
            : nil

        let task = NewTask(
            companyId: companyId,
            projectId: projectId,
            siteId: siteId,
            name: name.trimmingCharacters(in: .whitespaces),
            description: description.isEmpty ? nil : description,
            status: status,
            priority: priority,
            dueDate: dateString,
            completionPercentage: completionPercentage
        )

        await onSave(task)
        isSaving = false
        dismiss()
    }
}

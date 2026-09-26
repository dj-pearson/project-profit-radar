import SwiftUI

struct RFIListView: View {
    let projectId: String
    let companyId: String

    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel = RecordListViewModel<RFI>(table: "rfis")
    @State private var filter: String?
    @State private var showingForm = false

    private var visible: [RFI] {
        guard let filter else { return viewModel.records }
        return viewModel.records.filter { $0.status == filter }
    }

    var body: some View {
        VStack(spacing: 0) {
            ChipFilterBar(
                options: RFIStatus.allCases.map { FilterOption(value: $0.rawValue, label: $0.label) },
                selected: $filter
            )
            RecordListContainer(
                isLoading: viewModel.isLoading,
                errorMessage: viewModel.errorMessage,
                isEmpty: visible.isEmpty,
                emptyIcon: "questionmark.bubble",
                emptyTitle: "No RFIs",
                emptyMessage: filter == nil ? "Raise an RFI when the drawings or specs leave a question open." : "No RFIs match this filter.",
                retry: { await viewModel.load(projectId: projectId) }
            ) {
                List {
                    ForEach(visible) { rfi in
                        RFIRowView(rfi: rfi)
                            .swipeActions(edge: .trailing) {
                                if rfi.status != RFIStatus.closed.rawValue {
                                    Button("Close") { Task { await close(rfi) } }
                                        .tint(.green)
                                }
                                if rfi.status == RFIStatus.submitted.rawValue {
                                    Button("Responded") { Task { await setStatus(rfi, .responded) } }
                                        .tint(.blue)
                                }
                            }
                    }
                }
                .listStyle(.plain)
                .refreshable { await viewModel.load(projectId: projectId) }
            }
            SaveNoticeView(notice: viewModel.notice, error: viewModel.records.isEmpty ? nil : viewModel.errorMessage)
        }
        .navigationTitle("RFIs")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showingForm = true } label: { Image(systemName: "plus") }
                    .accessibilityLabel("New RFI")
            }
        }
        .sheet(isPresented: $showingForm) {
            RFIFormView { subject, description, priority, submittedTo, dueDate in
                let rfi = NewRFI(
                    companyId: companyId,
                    projectId: projectId,
                    subject: subject,
                    description: description,
                    priority: priority,
                    submittedTo: submittedTo,
                    dueDate: dueDate,
                    createdBy: auth.userProfile?.id
                )
                return await viewModel.create(rfi) == .saved
            }
        }
        .task { await viewModel.load(projectId: projectId) }
    }

    private func close(_ rfi: RFI) async {
        let update = RFIUpdate(status: RFIStatus.closed.rawValue, responseDate: DateFormatting.localISODate(.now))
        await viewModel.update(id: rfi.id, update)
    }

    private func setStatus(_ rfi: RFI, _ status: RFIStatus) async {
        await viewModel.update(id: rfi.id, RFIUpdate(status: status.rawValue, responseDate: nil))
    }
}

private struct RFIRowView: View {
    let rfi: RFI

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(rfi.subject)
                    .font(.body.weight(.medium))
                    .lineLimit(2)
                Spacer()
                StatusBadge(status: rfi.status ?? "submitted")
            }
            HStack(spacing: 12) {
                Text(rfi.rfiNumber)
                    .font(.caption.monospacedDigit())
                if let priority = rfi.priority {
                    Text(priority.capitalized)
                        .font(.caption)
                        .foregroundStyle(priority == "urgent" || priority == "high" ? Color.brandDanger : .secondary)
                }
                if rfi.dueDate != nil {
                    Label(DateFormatting.displayDate(rfi.dueDate), systemImage: "calendar")
                        .font(.caption)
                }
                if let to = rfi.submittedTo, !to.isEmpty {
                    Text("To \(to)")
                        .font(.caption)
                        .lineLimit(1)
                }
            }
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}

private struct RFIFormView: View {
    /// Returns true when saved, which dismisses the sheet.
    let onSave: (_ subject: String, _ description: String?, _ priority: String,
                 _ submittedTo: String?, _ dueDate: String?) async -> Bool

    @Environment(\.dismiss) private var dismiss
    @State private var subject = ""
    @State private var description = ""
    @State private var priority = "medium"
    @State private var submittedTo = ""
    @State private var hasDueDate = true
    @State private var dueDate = Calendar.current.date(byAdding: .day, value: 7, to: .now) ?? .now
    @State private var isSaving = false
    @State private var failed = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Question") {
                    TextField("Subject", text: $subject)
                    TextField("Details", text: $description, axis: .vertical)
                        .lineLimit(3...8)
                }
                Section("Routing") {
                    TextField("Submitted to (architect, engineer...)", text: $submittedTo)
                    PriorityPicker(selection: $priority)
                    Toggle("Response due", isOn: $hasDueDate)
                    if hasDueDate {
                        DatePicker("Due", selection: $dueDate, displayedComponents: .date)
                    }
                }
                if failed {
                    Section { Text("Couldn't save the RFI. Check your connection and try again.").foregroundStyle(Color.brandDanger) }
                }
            }
            .navigationTitle("New RFI")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Submit") { Task { await save() } }
                        .disabled(subject.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        let ok = await onSave(
            subject.trimmingCharacters(in: .whitespaces),
            description.isEmpty ? nil : description,
            priority,
            submittedTo.isEmpty ? nil : submittedTo,
            hasDueDate ? DateFormatting.localISODate(dueDate) : nil
        )
        if ok { dismiss() } else { failed = true }
    }
}

/// Low / Medium / High / Urgent, the scale RFIs and punch items share on web.
struct PriorityPicker: View {
    @Binding var selection: String
    var options = ["low", "medium", "high", "urgent"]

    var body: some View {
        Picker("Priority", selection: $selection) {
            ForEach(options, id: \.self) { Text($0.capitalized).tag($0) }
        }
    }
}

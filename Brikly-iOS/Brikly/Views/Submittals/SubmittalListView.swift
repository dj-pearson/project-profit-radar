import SwiftUI

struct SubmittalListView: View {
    let projectId: String
    let companyId: String

    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel = RecordListViewModel<Submittal>(table: "submittals")
    @State private var filter: String?
    @State private var showingForm = false

    private let service = RecordService()

    private var visible: [Submittal] {
        guard let filter else { return viewModel.records }
        return viewModel.records.filter { $0.status == filter }
    }

    var body: some View {
        VStack(spacing: 0) {
            ChipFilterBar(
                options: SubmittalStatus.allCases.map { FilterOption(value: $0.rawValue, label: $0.label) },
                selected: $filter
            )
            RecordListContainer(
                isLoading: viewModel.isLoading,
                errorMessage: viewModel.errorMessage,
                isEmpty: visible.isEmpty,
                emptyIcon: "doc.badge.gearshape",
                emptyTitle: "No Submittals",
                emptyMessage: filter == nil ? "Track shop drawings, product data and samples here." : "No submittals match this filter.",
                retry: { await viewModel.load(projectId: projectId) }
            ) {
                List(visible) { submittal in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(alignment: .firstTextBaseline) {
                            Text(submittal.title)
                                .font(.body.weight(.medium))
                                .lineLimit(2)
                            Spacer()
                            StatusBadge(status: submittal.status ?? "draft")
                        }
                        HStack(spacing: 12) {
                            Text(submittal.submittalNumber).font(.caption.monospacedDigit())
                            if let spec = submittal.specSection, !spec.isEmpty {
                                Text("Spec \(spec)").font(.caption)
                            }
                            if submittal.dueDate != nil {
                                Label(DateFormatting.displayDate(submittal.dueDate), systemImage: "calendar")
                                    .font(.caption)
                            }
                        }
                        .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                    .accessibilityElement(children: .combine)
                }
                .listStyle(.plain)
                .refreshable { await viewModel.load(projectId: projectId) }
            }
            SaveNoticeView(notice: viewModel.notice, error: viewModel.records.isEmpty ? nil : viewModel.errorMessage)
        }
        .navigationTitle("Submittals")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showingForm = true } label: { Image(systemName: "plus") }
                    .accessibilityLabel("New submittal")
            }
        }
        .sheet(isPresented: $showingForm) {
            SubmittalFormView { title, description, spec, due, priority in
                // Web numbers submittals SUB-<year>-<company total + 1>.
                let existing = (try? await service.count("submittals", companyId: companyId)) ?? viewModel.records.count
                let year = Calendar.current.component(.year, from: .now)
                let submittal = NewSubmittal(
                    companyId: companyId,
                    projectId: projectId,
                    title: title,
                    description: description,
                    specSection: spec,
                    dueDate: due,
                    priority: priority,
                    submittalNumber: String(format: "SUB-%ld-%03ld", year, existing + 1),
                    createdBy: auth.userProfile?.id
                )
                return await viewModel.create(submittal) == .saved
            }
        }
        .task { await viewModel.load(projectId: projectId) }
    }
}

private struct SubmittalFormView: View {
    let onSave: (_ title: String, _ description: String?, _ spec: String?, _ due: String, _ priority: String) async -> Bool

    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var description = ""
    @State private var spec = ""
    @State private var priority = "medium"
    // Web defaults the due date to ten days out.
    @State private var dueDate = Calendar.current.date(byAdding: .day, value: 10, to: .now) ?? .now
    @State private var isSaving = false
    @State private var failed = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Submittal") {
                    TextField("Title", text: $title)
                    TextField("Spec section (e.g. 08 71 00)", text: $spec)
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(2...6)
                }
                Section("Schedule") {
                    PriorityPicker(selection: $priority, options: ["low", "medium", "high"])
                    DatePicker("Due", selection: $dueDate, displayedComponents: .date)
                }
                if failed {
                    Section { Text("Couldn't save the submittal. Try again.").foregroundStyle(Color.brandDanger) }
                }
            }
            .navigationTitle("New Submittal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { Task { await save() } }
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        let ok = await onSave(
            title.trimmingCharacters(in: .whitespaces),
            description.isEmpty ? nil : description,
            spec.isEmpty ? nil : spec,
            DateFormatting.localISODate(dueDate),
            priority
        )
        if ok { dismiss() } else { failed = true }
    }
}

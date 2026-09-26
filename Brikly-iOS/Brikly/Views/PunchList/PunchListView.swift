import SwiftUI

struct PunchListView: View {
    let projectId: String
    let companyId: String

    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel = RecordListViewModel<PunchListItem>(table: "punch_list_items")
    @State private var filter: String? = PunchStatus.open.rawValue
    @State private var showingForm = false

    private var visible: [PunchListItem] {
        guard let filter else { return viewModel.records }
        return viewModel.records.filter { ($0.status ?? PunchStatus.open.rawValue) == filter }
    }

    var body: some View {
        VStack(spacing: 0) {
            ChipFilterBar(
                options: PunchStatus.allCases.map { FilterOption(value: $0.rawValue, label: $0.label) },
                selected: $filter
            )
            RecordListContainer(
                isLoading: viewModel.isLoading,
                errorMessage: viewModel.errorMessage,
                isEmpty: visible.isEmpty,
                emptyIcon: "checklist.checked",
                emptyTitle: "No Punch Items",
                emptyMessage: filter == nil ? "Add deficiencies as you walk the job." : "Nothing in this status.",
                retry: { await viewModel.load(projectId: projectId) }
            ) {
                List {
                    ForEach(visible) { item in
                        PunchRowView(item: item)
                            .swipeActions(edge: .trailing) {
                                if item.status != PunchStatus.completed.rawValue && item.status != PunchStatus.verified.rawValue {
                                    Button("Done") { Task { await setStatus(item, .completed) } }
                                        .tint(.green)
                                }
                                if (item.status ?? "open") == PunchStatus.open.rawValue {
                                    Button("Start") { Task { await setStatus(item, .inProgress) } }
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
        .navigationTitle("Punch List")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showingForm = true } label: { Image(systemName: "plus") }
                    .accessibilityLabel("New punch item")
            }
        }
        .sheet(isPresented: $showingForm) {
            PunchFormView(projectId: projectId, companyId: companyId, createdBy: auth.userProfile?.id) { item in
                await viewModel.create(item, offlineEntity: "punch_list_item") != .failed
            }
        }
        .task { await viewModel.load(projectId: projectId) }
    }

    private func setStatus(_ item: PunchListItem, _ status: PunchStatus) async {
        let update = PunchListItemUpdate(
            status: status.rawValue,
            dateCompleted: status == .completed ? DateFormatting.localISODate(.now) : nil
        )
        await viewModel.update(id: item.id, update, offlineEntity: "punch_list_item")
    }
}

private struct PunchRowView: View {
    let item: PunchListItem

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(item.description)
                    .font(.body.weight(.medium))
                    .lineLimit(3)
                Spacer()
                StatusBadge(status: item.status ?? "open")
            }
            HStack(spacing: 12) {
                Text(item.itemNumber).font(.caption.monospacedDigit())
                if let location = item.location, !location.isEmpty {
                    Label(location, systemImage: "mappin").font(.caption).lineLimit(1)
                }
                if let trade = item.trade, !trade.isEmpty {
                    Text(trade).font(.caption).lineLimit(1)
                }
                if let priority = item.priority, priority == "high" || priority == "urgent" {
                    Text(priority.capitalized).font(.caption.weight(.semibold)).foregroundStyle(Color.brandDanger)
                }
            }
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}

private struct PunchFormView: View {
    let projectId: String
    let companyId: String
    let createdBy: String?
    let onSave: (NewPunchListItem) async -> Bool

    @Environment(\.dismiss) private var dismiss
    @State private var description = ""
    @State private var location = ""
    @State private var trade = ""
    @State private var priority = "medium"
    @State private var category = PunchCategory.deficiency.rawValue
    @State private var hasDueDate = false
    @State private var dueDate = Date()
    @State private var isSaving = false
    @State private var failed = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Item") {
                    TextField("What needs fixing", text: $description, axis: .vertical)
                        .lineLimit(2...6)
                    TextField("Location (e.g. 2nd floor bath)", text: $location)
                    TextField("Trade (e.g. drywall)", text: $trade)
                }
                Section("Classification") {
                    Picker("Category", selection: $category) {
                        ForEach(PunchCategory.allCases, id: \.rawValue) { Text($0.label).tag($0.rawValue) }
                    }
                    PriorityPicker(selection: $priority)
                    Toggle("Due date", isOn: $hasDueDate)
                    if hasDueDate {
                        DatePicker("Due", selection: $dueDate, displayedComponents: .date)
                    }
                }
                if failed {
                    Section { Text("Couldn't save the item. Try again.").foregroundStyle(Color.brandDanger) }
                }
            }
            .navigationTitle("New Punch Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") { Task { await save() } }
                        .disabled(description.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        let item = NewPunchListItem(
            companyId: companyId,
            projectId: projectId,
            description: description.trimmingCharacters(in: .whitespaces),
            location: location.isEmpty ? nil : location,
            trade: trade.isEmpty ? nil : trade,
            priority: priority,
            category: category,
            dueDate: hasDueDate ? DateFormatting.localISODate(dueDate) : nil,
            createdBy: createdBy
        )
        if await onSave(item) { dismiss() } else { failed = true }
    }
}

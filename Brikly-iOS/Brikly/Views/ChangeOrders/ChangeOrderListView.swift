import SwiftUI

@Observable
@MainActor
final class ChangeOrderListViewModel {
    var orders: [ChangeOrder] = []
    var isLoading = false
    var errorMessage: String?

    private let service = ChangeOrderService()

    var approvedTotal: Double {
        orders.filter { $0.status == "approved" }.reduce(0) { $0 + $1.amount }
    }

    var pendingTotal: Double {
        orders.filter { ($0.status ?? "pending") == "pending" }.reduce(0) { $0 + $1.amount }
    }

    func load(projectId: String) async {
        isLoading = orders.isEmpty
        errorMessage = nil
        defer { isLoading = false }
        do {
            orders = try await service.list(projectId: projectId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func create(_ body: ChangeOrderService.CreateBody) async -> Bool {
        do {
            let order = try await service.create(body)
            orders.insert(order, at: 0)
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func decide(_ order: ChangeOrder, approved: Bool, reason: String?) async {
        do {
            let updated = try await service.decide(orderId: order.id, approved: approved, reason: reason)
            if let index = orders.firstIndex(where: { $0.id == order.id }) {
                orders[index] = updated
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct ChangeOrderListView: View {
    let projectId: String

    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel = ChangeOrderListViewModel()
    @State private var showingForm = false
    @State private var rejecting: ChangeOrder?
    @State private var rejectionReason = ""

    private var canManage: Bool { ChangeOrderPermissions.canManage(role: auth.userRole) }

    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView(message: "Loading change orders...")
            } else if let error = viewModel.errorMessage, viewModel.orders.isEmpty {
                ErrorView(message: error) { await viewModel.load(projectId: projectId) }
            } else if viewModel.orders.isEmpty {
                EmptyStateView(
                    icon: "arrow.triangle.2.circlepath.doc.on.clipboard",
                    title: "No Change Orders",
                    message: canManage ? "Record scope changes before the work is done." : "Change orders for this project will appear here."
                )
            } else {
                List {
                    Section {
                        LabeledContent("Approved", value: CurrencyFormatter.format(viewModel.approvedTotal))
                        LabeledContent("Pending", value: CurrencyFormatter.format(viewModel.pendingTotal))
                    }
                    Section {
                        ForEach(viewModel.orders) { order in
                            ChangeOrderRowView(order: order)
                                .swipeActions(edge: .trailing) {
                                    if canManage && (order.status ?? "pending") == "pending" && order.internalApproved != true {
                                        Button("Approve") {
                                            Task { await viewModel.decide(order, approved: true, reason: nil) }
                                        }
                                        .tint(.green)
                                        Button("Reject") { rejecting = order }
                                            .tint(.red)
                                    }
                                }
                        }
                    } footer: {
                        if canManage {
                            Text("Swipe a pending order to approve or reject it internally. The client approves from their portal.")
                        }
                    }
                    if let error = viewModel.errorMessage {
                        Section { Text(error).foregroundStyle(Color.brandDanger) }
                    }
                }
                .listStyle(.insetGrouped)
                .refreshable { await viewModel.load(projectId: projectId) }
            }
        }
        .navigationTitle("Change Orders")
        .toolbar {
            if canManage {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showingForm = true } label: { Image(systemName: "plus") }
                        .accessibilityLabel("New change order")
                }
            }
        }
        .sheet(isPresented: $showingForm) {
            ChangeOrderFormView(projectId: projectId) { body in
                await viewModel.create(body)
            }
        }
        .alert("Reject change order?", isPresented: Binding(
            get: { rejecting != nil },
            set: { if !$0 { rejecting = nil } }
        )) {
            TextField("Reason", text: $rejectionReason)
            Button("Cancel", role: .cancel) { rejecting = nil }
            Button("Reject", role: .destructive) {
                if let order = rejecting {
                    let reason = rejectionReason.isEmpty ? nil : rejectionReason
                    Task { await viewModel.decide(order, approved: false, reason: reason) }
                }
                rejecting = nil
                rejectionReason = ""
            }
        } message: {
            Text(rejecting.map { "\($0.changeOrderNumber): \($0.title)" } ?? "")
        }
        .task { await viewModel.load(projectId: projectId) }
    }
}

private struct ChangeOrderRowView: View {
    let order: ChangeOrder

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(order.title)
                    .font(.body.weight(.medium))
                    .lineLimit(2)
                Spacer()
                Text(CurrencyFormatter.format(order.amount))
                    .font(.body.monospacedDigit())
            }
            HStack(spacing: 8) {
                Text(order.changeOrderNumber).monospacedDigit()
                StatusBadge(status: order.status ?? "pending")
                Text(order.approvalSummary)
                if let days = order.impactDays, days != 0 {
                    Text("\(days > 0 ? "+" : "")\(days) days")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}

private struct ChangeOrderFormView: View {
    let projectId: String
    let onSave: (ChangeOrderService.CreateBody) async -> Bool

    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var description = ""
    @State private var amount = ""
    @State private var reason = ChangeOrderReason.clientRequest.rawValue
    @State private var hasDueDate = false
    @State private var dueDate = Calendar.current.date(byAdding: .day, value: 7, to: .now) ?? .now
    @State private var isSaving = false
    @State private var failed = false

    /// Negative amounts are credits back to the client.
    private var amountValue: Double? { Double(amount.replacingOccurrences(of: ",", with: "")) }

    var body: some View {
        NavigationStack {
            Form {
                Section("Change") {
                    TextField("Title", text: $title)
                    TextField("Scope of the change", text: $description, axis: .vertical)
                        .lineLimit(3...8)
                    Picker("Reason", selection: $reason) {
                        ForEach(ChangeOrderReason.allCases, id: \.rawValue) { Text($0.label).tag($0.rawValue) }
                    }
                }
                Section {
                    TextField("Amount", text: $amount).keyboardType(.numbersAndPunctuation)
                    Toggle("Approval due", isOn: $hasDueDate)
                    if hasDueDate {
                        DatePicker("Due", selection: $dueDate, displayedComponents: .date)
                    }
                } header: {
                    Text("Price")
                } footer: {
                    Text("Use a negative amount for a credit.")
                }
                if failed {
                    Section { Text("Couldn't create the change order.").foregroundStyle(Color.brandDanger) }
                }
            }
            .navigationTitle("New Change Order")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { Task { await save() } }
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || amountValue == nil || isSaving)
                }
            }
        }
    }

    private func save() async {
        guard let value = amountValue else { return }
        isSaving = true
        defer { isSaving = false }
        let body = ChangeOrderService.CreateBody(
            projectId: projectId,
            title: title.trimmingCharacters(in: .whitespaces),
            description: description.isEmpty ? nil : description,
            amount: value,
            reason: reason,
            approvalDueDate: hasDueDate ? DateFormatting.localISODate(dueDate) : nil
        )
        if await onSave(body) { dismiss() } else { failed = true }
    }
}

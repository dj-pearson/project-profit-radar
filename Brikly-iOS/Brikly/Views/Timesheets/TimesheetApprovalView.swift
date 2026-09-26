import SwiftUI

@Observable
@MainActor
final class TimesheetApprovalViewModel {
    var entries: [PendingTimesheet] = []
    var selected: Set<String> = []
    var isLoading = false
    var isWorking = false
    var errorMessage: String?
    var message: String?

    private let service = TimesheetService()

    struct WorkerGroup: Identifiable {
        let worker: String
        let entries: [PendingTimesheet]
        var id: String { worker }
        var hours: Double { entries.reduce(0) { $0 + ($1.totalHours ?? 0) } }
    }

    var byWorker: [WorkerGroup] {
        Dictionary(grouping: entries, by: \.displayWorker)
            .map { WorkerGroup(worker: $0.key, entries: $0.value.sorted { $0.startTime > $1.startTime }) }
            .sorted { $0.worker < $1.worker }
    }

    func load() async {
        isLoading = entries.isEmpty
        errorMessage = nil
        defer { isLoading = false }
        do {
            // Open shifts can't be approved: no hours yet.
            entries = try await service.pending().filter { $0.endTime != nil }
            selected = selected.intersection(entries.map(\.id))
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "TimesheetApproval")
        }
    }

    func approve(_ ids: [String], approverId: String) async {
        await run(verb: "Approved") { try await self.service.approve(ids: ids, approverId: approverId, notes: nil) }
    }

    func reject(_ ids: [String], approverId: String, reason: String) async {
        await run(verb: "Rejected") { try await self.service.reject(ids: ids, rejectorId: approverId, reason: reason) }
    }

    private func run(verb: String, _ call: () async throws -> BulkTimesheetResult) async {
        isWorking = true
        errorMessage = nil
        message = nil
        defer { isWorking = false }
        do {
            let result = try await call()
            if result.failedCount > 0 {
                // The server refuses self-approval and other companies' time;
                // those rows count as failed.
                errorMessage = "\(verb) \(result.successCount). \(result.failedCount) couldn't be changed (your own time, or already decided)."
            } else {
                message = "\(verb) \(result.successCount) \(result.successCount == 1 ? "entry" : "entries")."
            }
            selected = []
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Approval queue for managers: the web Timesheets page's pending tab.
/// Approving posts labor cost through the database trigger; nothing is
/// computed on the device.
struct TimesheetApprovalView: View {
    @Environment(AuthViewModel.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = TimesheetApprovalViewModel()
    @State private var rejecting: [String]?
    @State private var reason = ""

    private var approverId: String { auth.userProfile?.id ?? "" }

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView(message: "Loading timesheets...")
                } else if let error = viewModel.errorMessage, viewModel.entries.isEmpty {
                    ErrorView(message: error) { await viewModel.load() }
                } else if viewModel.entries.isEmpty {
                    EmptyStateView(icon: "checkmark.seal", title: "All Caught Up", message: "No time is waiting for approval.")
                } else {
                    List(selection: Binding(get: { viewModel.selected }, set: { viewModel.selected = $0 })) {
                        ForEach(viewModel.byWorker) { group in
                            Section {
                                ForEach(group.entries) { entry in
                                    TimesheetRow(entry: entry)
                                        .tag(entry.id)
                                        .swipeActions(edge: .trailing) {
                                            Button("Approve") {
                                                Task { await viewModel.approve([entry.id], approverId: approverId) }
                                            }
                                            .tint(.green)
                                            Button("Reject") { rejecting = [entry.id] }
                                                .tint(.red)
                                        }
                                }
                            } header: {
                                Text("\(group.worker) · \(String(format: "%.2f h", group.hours))")
                            }
                        }
                        if let message = viewModel.message {
                            Section { Label(message, systemImage: "checkmark.circle").foregroundStyle(Color.brandSuccess) }
                        }
                        if let error = viewModel.errorMessage {
                            Section { Text(error).foregroundStyle(Color.brandDanger) }
                        }
                    }
                    .environment(\.editMode, .constant(.active))
                    .refreshable { await viewModel.load() }
                }
            }
            .navigationTitle("Approve Time")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
                ToolbarItemGroup(placement: .bottomBar) {
                    Button("Reject \(viewModel.selected.count)") { rejecting = Array(viewModel.selected) }
                        .disabled(viewModel.selected.isEmpty || viewModel.isWorking)
                    Spacer()
                    Button("Approve \(viewModel.selected.count)") {
                        Task { await viewModel.approve(Array(viewModel.selected), approverId: approverId) }
                    }
                    .fontWeight(.semibold)
                    .disabled(viewModel.selected.isEmpty || viewModel.isWorking)
                }
            }
            .alert("Reject time?", isPresented: Binding(get: { rejecting != nil }, set: { if !$0 { rejecting = nil } })) {
                TextField("Reason (the worker sees this)", text: $reason)
                Button("Cancel", role: .cancel) { rejecting = nil }
                Button("Reject", role: .destructive) {
                    let ids = rejecting ?? []
                    let text = reason.trimmingCharacters(in: .whitespaces)
                    rejecting = nil
                    reason = ""
                    Task { await viewModel.reject(ids, approverId: approverId, reason: text.isEmpty ? "Rejected" : text) }
                }
            }
            .task { await viewModel.load() }
        }
    }
}

private struct TimesheetRow: View {
    let entry: PendingTimesheet

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(entry.projectName ?? "Project").font(.body.weight(.medium)).lineLimit(1)
                Spacer()
                Text(String(format: "%.2f h", entry.totalHours ?? 0)).font(.body.monospacedDigit())
            }
            HStack(spacing: 8) {
                Text(entry.startTime.formatted(date: .abbreviated, time: .shortened))
                if let code = entry.costCode { Text(code).monospacedDigit() } else {
                    Text("No cost code").fontWeight(.semibold).foregroundStyle(Color.brandWarning)
                }
                if let minutes = entry.breakDuration, minutes > 0 { Text("\(Int(minutes)) min break") }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }
}

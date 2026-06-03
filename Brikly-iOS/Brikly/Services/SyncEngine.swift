import Foundation
import Network
import Observation

// MARK: - Network Monitor

/// Live reachability state. Drives the offline banner and triggers the
/// SyncEngine drain when connectivity returns.
@MainActor
@Observable
final class NetworkMonitor {
    static let shared = NetworkMonitor()

    /// True once a path with `.satisfied` status has been observed. Defaults
    /// to true (optimistic) so the UI doesn't flash an "offline" banner on
    /// launch before the first path callback fires.
    private(set) var isOnline: Bool = true
    private(set) var isConstrained: Bool = false
    private(set) var isExpensive: Bool = false

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "net.brikly.network-monitor")
    private var hasStarted = false

    private init() {}

    func start() {
        guard !hasStarted else { return }
        hasStarted = true

        monitor.pathUpdateHandler = { [weak self] path in
            let online = path.status == .satisfied
            let constrained = path.isConstrained
            let expensive = path.isExpensive
            Task { @MainActor in
                guard let self else { return }
                let wasOnline = self.isOnline
                self.isOnline = online
                self.isConstrained = constrained
                self.isExpensive = expensive
                if online && !wasOnline {
                    // Connection just restored — drain the queue without blocking the path callback.
                    Task { await SyncEngine.shared.drain() }
                }
            }
        }
        monitor.start(queue: queue)
    }
}

// MARK: - Sync Engine

/// Replays queued writes against the live backend when the network is
/// reachable. ViewModels stage writes via `OfflineStore.enqueue(...)`;
/// the engine processes the queue oldest-first, removing entries on success
/// and bumping the attempt counter on failure. Stops on the first failure
/// per drain cycle to preserve per-entity ordering (e.g. create-then-update).
@MainActor
final class SyncEngine {
    static let shared = SyncEngine()

    private let store = OfflineStore.shared
    private var isDraining = false

    /// Attempt count that triggers a "give up" log (the mutation stays
    /// queued — manual recovery only).
    private let maxAttempts = 5

    private init() {}

    /// Drain the pending mutation queue. Safe to call repeatedly; only one
    /// drain runs at a time. No-op when offline.
    func drain() async {
        guard !isDraining, NetworkMonitor.shared.isOnline else { return }
        isDraining = true
        defer { isDraining = false }

        let mutations = store.pendingMutations()
        guard !mutations.isEmpty else { return }

        Loggers.services.info("Sync engine draining \(mutations.count, privacy: .public) pending mutations")
        for mutation in mutations {
            // Skip mutations that already exhausted the retry budget; they
            // remain queued so an admin/restore flow can inspect them.
            if mutation.attempts >= maxAttempts { continue }

            do {
                try await replay(mutation)
                store.remove(mutation)
            } catch {
                CrashReporter.capture(error, context: "SyncEngine.replay(\(mutation.entityType)/\(mutation.operation))")
                store.recordFailure(mutation, error: error.localizedDescription)
                if mutation.attempts >= maxAttempts {
                    Loggers.services.error("Mutation \(mutation.id, privacy: .public) gave up after \(self.maxAttempts) attempts")
                }
                // Stop after the first failure so per-entity ordering is preserved
                // (e.g. a create-then-update for the same row replays in order).
                break
            }
        }
    }

    // MARK: - Per-entity dispatch

    private let supabase = SupabaseService.shared.client

    private func replay(_ mutation: PendingMutation) async throws {
        switch mutation.entityType {
        case "daily_report":
            try await replayDailyReport(mutation)
        case "task":
            try await replayTask(mutation)
        case "job_cost":
            try await replayJobCost(mutation)
        default:
            throw SyncError.unsupportedEntity(mutation.entityType)
        }
    }

    private func replayDailyReport(_ mutation: PendingMutation) async throws {
        // Both NewDailyReport and DailyReportUpdate have explicit snake_case
        // CodingKeys, so a plain JSONDecoder maps them correctly.
        let decoder = JSONDecoder()

        switch mutation.operation {
        case "create":
            let body = try decoder.decode(NewDailyReport.self, from: mutation.payload)
            let response: [DailyReport] = try await supabase
                .from("daily_reports")
                .insert(body)
                .select()
                .execute()
                .value
            if let inserted = response.first {
                store.upsertDailyReport(inserted)
            }

        case "update":
            guard let entityId = mutation.entityId else { throw SyncError.missingEntityId }
            let body = try decoder.decode(DailyReportUpdate.self, from: mutation.payload)
            let response: [DailyReport] = try await supabase
                .from("daily_reports")
                .update(body)
                .eq("id", value: entityId)
                .select()
                .execute()
                .value
            if let updated = response.first {
                store.upsertDailyReport(updated)
            }

        default:
            throw SyncError.unsupportedOperation(mutation.operation)
        }
    }

    private func replayTask(_ mutation: PendingMutation) async throws {
        // NewTask and TaskUpdate both declare explicit snake_case CodingKeys,
        // so a plain JSONDecoder maps the queued payload correctly.
        let decoder = JSONDecoder()

        switch mutation.operation {
        case "create":
            let body = try decoder.decode(NewTask.self, from: mutation.payload)
            let response: [ProjectTask] = try await supabase
                .from("tasks")
                .insert(body)
                .select()
                .execute()
                .value
            if let inserted = response.first {
                store.upsertTask(inserted)
            }

        case "update":
            guard let entityId = mutation.entityId else { throw SyncError.missingEntityId }
            let body = try decoder.decode(TaskUpdate.self, from: mutation.payload)
            let response: [ProjectTask] = try await supabase
                .from("tasks")
                .update(body)
                .eq("id", value: entityId)
                .select()
                .execute()
                .value
            if let updated = response.first {
                store.upsertTask(updated)
            }

        default:
            throw SyncError.unsupportedOperation(mutation.operation)
        }
    }

    private func replayJobCost(_ mutation: PendingMutation) async throws {
        // Job costs are append-only by domain — only the create path is replayed.
        let decoder = JSONDecoder()

        switch mutation.operation {
        case "create":
            let body = try decoder.decode(NewJobCost.self, from: mutation.payload)
            let response: [JobCost] = try await supabase
                .from("job_costs")
                .insert(body)
                .select()
                .execute()
                .value
            if let inserted = response.first {
                store.upsertJobCost(inserted)
            }

        default:
            throw SyncError.unsupportedOperation(mutation.operation)
        }
    }

    enum SyncError: LocalizedError {
        case unsupportedEntity(String)
        case unsupportedOperation(String)
        case missingEntityId

        var errorDescription: String? {
            switch self {
            case .unsupportedEntity(let t):
                return "Sync engine doesn't know how to replay '\(t)' yet."
            case .unsupportedOperation(let o):
                return "Sync engine doesn't know operation '\(o)'."
            case .missingEntityId:
                return "Update mutation missing entity id."
            }
        }
    }
}

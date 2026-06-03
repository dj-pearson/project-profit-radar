import Foundation
import Observation

/// Offline-first project task list. Mirrors `DailyReportListViewModel`:
///
/// Read flow:
///   1. Hydrate from `OfflineStore` immediately so the list is visible even
///      before the network is touched.
///   2. Background-refresh from the server; on success replace the cache with
///      the authoritative list.
///
/// Write flow (create / update):
///   1. Try the network first when online.
///   2. On failure (or offline), enqueue a `PendingMutation` and apply an
///      optimistic local row/merge so the UI updates immediately. The
///      `SyncEngine` drains the queue on reconnect.
@Observable
@MainActor
final class TaskListViewModel {
    var tasks: [ProjectTask] = []
    var isLoading = false
    var errorMessage: String?
    var selectedStatus: TaskStatus?

    private let service = TaskService()
    private let store = OfflineStore.shared

    /// Filter chips operate on the in-memory list, whether it was sourced from
    /// cache or network.
    var filteredTasks: [ProjectTask] {
        guard let status = selectedStatus else { return tasks }
        return tasks.filter { $0.displayStatus == status }
    }

    func loadTasks(projectId: String) async {
        // 1. Cache hydrate (synchronous, instant).
        let cached = store.cachedTasks(projectId: projectId)
        if !cached.isEmpty {
            tasks = cached
        }

        // 2. Background refresh from the server.
        isLoading = tasks.isEmpty   // Only show the spinner if we had nothing to display.
        errorMessage = nil

        do {
            let fresh = try await service.fetchTasks(projectId: projectId)
            tasks = fresh
            store.cacheTasks(fresh, projectId: projectId)
        } catch {
            // Network failed — keep showing cached data; surface an error only
            // if the cache was empty too.
            if tasks.isEmpty {
                errorMessage = DecodingErrorHelper.handle(error, context: "TaskList")
            }
        }
        isLoading = false
    }

    func createTask(_ task: NewTask) async {
        if NetworkMonitor.shared.isOnline {
            do {
                let created = try await service.createTask(task)
                tasks.insert(created, at: 0)
                store.upsertTask(created)
                return
            } catch {
                CrashReporter.breadcrumb("createTask network failure → enqueue", category: "sync")
            }
        }

        // Offline path: enqueue + show optimistic local row with a temporary id.
        store.enqueue(entityType: "task", operation: "create", body: task)
        let temp = optimisticTask(from: task)
        tasks.insert(temp, at: 0)
        store.upsertTask(temp)
    }

    func updateTask(id: String, updates: TaskUpdate) async {
        if NetworkMonitor.shared.isOnline {
            do {
                let updated = try await service.updateTask(id: id, updates: updates)
                if let index = tasks.firstIndex(where: { $0.id == id }) {
                    tasks[index] = updated
                }
                store.upsertTask(updated)
                return
            } catch {
                CrashReporter.breadcrumb("updateTask network failure → enqueue", category: "sync")
            }
        }

        // Offline path: enqueue + apply optimistic merge to the in-memory copy.
        store.enqueue(entityType: "task", operation: "update", entityId: id, body: updates)
        if let index = tasks.firstIndex(where: { $0.id == id }) {
            let merged = applyUpdates(updates, to: tasks[index])
            tasks[index] = merged
            store.upsertTask(merged)
        }
    }

    // MARK: - Optimistic helpers

    /// "yyyy-MM-dd" → Date for optimistic display of the queued due date.
    private static let dateOnlyFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .iso8601)
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    /// Build a placeholder `ProjectTask` from a `NewTask` for offline display.
    /// The real id is assigned server-side; we use a `local-` prefix until the
    /// SyncEngine swaps it for the authoritative row on the next refresh.
    private func optimisticTask(from new: NewTask) -> ProjectTask {
        ProjectTask(
            id: "local-\(UUID().uuidString)",
            companyId: new.companyId,
            projectId: new.projectId,
            siteId: new.siteId,
            name: new.name,
            description: new.description,
            status: new.status ?? TaskStatus.pending.rawValue,
            priority: new.priority,
            assignedTo: new.assignedTo,
            dueDate: new.dueDate.flatMap { Self.dateOnlyFormatter.date(from: $0) },
            startDate: nil,
            endDate: nil,
            completionPercentage: new.completionPercentage,
            estimatedHours: nil,
            actualHours: nil,
            durationDays: nil,
            isCriticalPath: nil,
            isMilestone: nil,
            milestoneType: nil,
            phaseId: nil,
            dependencies: nil,
            tags: nil,
            weatherSensitive: nil,
            weatherLastCheck: nil,
            createdBy: nil,
            createdAt: .now,
            updatedAt: nil
        )
    }

    private func applyUpdates(_ updates: TaskUpdate, to task: ProjectTask) -> ProjectTask {
        var copy = task
        if let v = updates.name { copy.name = v }
        if let v = updates.description { copy.description = v }
        if let v = updates.status { copy.status = v }
        if let v = updates.priority { copy.priority = v }
        if let v = updates.assignedTo { copy.assignedTo = v }
        if let v = updates.dueDate { copy.dueDate = Self.dateOnlyFormatter.date(from: v) }
        if let v = updates.completionPercentage { copy.completionPercentage = v }
        return copy
    }
}

import Foundation
import Observation
import Supabase

/// Home screen: what a field lead or PM checks first on the phone. Mirrors
/// the web `MobileDashboardHome` / `MyTasks` views: my open tasks, active
/// projects, hours this week, and whether I'm on the clock.
@Observable
@MainActor
final class DashboardViewModel {
    var myTasks: [ProjectTask] = []
    var activeProjects: [Project] = []
    var weekHours: Double = 0
    var openEntry: TimeEntry?
    var isLoading = false
    var errorMessage: String?

    private let projectService = ProjectService()
    private let timeService = TimeEntryService()
    private let store = OfflineStore.shared

    var overdueCount: Int {
        let today = Calendar.current.startOfDay(for: .now)
        return myTasks.filter { ($0.dueDate ?? .distantFuture) < today }.count
    }

    func project(for id: String) -> Project? { activeProjects.first { $0.id == id } }

    func load(userId: String, companyId: String) async {
        isLoading = activeProjects.isEmpty && myTasks.isEmpty
        errorMessage = nil
        defer { isLoading = false }

        let cached = store.cachedProjects(companyId: companyId)
        if !cached.isEmpty { activeProjects = Self.active(cached) }

        async let projects = projectService.fetchProjects(companyId: companyId)
        async let tasks = Self.fetchMyTasks(userId: userId)
        let weekStart = Calendar.current.dateInterval(of: .weekOfYear, for: .now)?.start ?? .now
        async let entries = timeService.fetchEntries(userId: userId, since: weekStart)
        async let openRow = timeService.fetchOpenEntry(userId: userId)

        do {
            let fresh = try await projects
            activeProjects = Self.active(fresh)
            store.cacheProjects(fresh, companyId: companyId)
        } catch {
            if activeProjects.isEmpty {
                errorMessage = DecodingErrorHelper.handle(error, context: "Dashboard.projects")
            }
        }
        let freshTasks = try? await tasks
        if let freshTasks { myTasks = freshTasks }
        let freshEntries = try? await entries
        if let freshEntries {
            weekHours = freshEntries.reduce(0) { $0 + $1.workedHours() }
        }
        do {
            openEntry = try await openRow
        } catch {
            // Offline: keep the last known clock state.
        }
    }

    /// Open tasks assigned to the user, soonest due first, undated last.
    private static func fetchMyTasks(userId: String) async throws -> [ProjectTask] {
        let tasks: [ProjectTask] = try await SupabaseService.shared.client
            .from("tasks")
            .select()
            .eq("assigned_to", value: userId)
            .order("due_date", ascending: true)
            .limit(100)
            .execute()
            .value
        let closed: Set<String> = ["completed", "cancelled"]
        return tasks
            .filter { !closed.contains($0.status ?? "") }
            .sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) }
    }

    private static func active(_ projects: [Project]) -> [Project] {
        projects.filter { $0.status == "active" || $0.status == "in_progress" }
    }
}

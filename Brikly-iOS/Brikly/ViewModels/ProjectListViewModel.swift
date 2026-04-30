import Foundation
import Observation

@Observable
@MainActor
final class ProjectListViewModel {
    var projects: [Project] = []
    var isLoading = false
    var errorMessage: String?
    var searchText = ""

    private let service = ProjectService()
    private let store = OfflineStore.shared

    /// Projects filtered by search and grouped by status.
    var groupedProjects: [(status: ProjectStatus, projects: [Project])] {
        let filtered: [Project]
        if searchText.isEmpty {
            filtered = projects
        } else {
            let query = searchText.lowercased()
            filtered = projects.filter {
                $0.name.lowercased().contains(query) ||
                ($0.clientName?.lowercased().contains(query) ?? false)
            }
        }

        let grouped = Dictionary(grouping: filtered) { $0.displayStatus }
        return grouped
            .map { (status: $0.key, projects: $0.value) }
            .sorted { $0.status.sortOrder < $1.status.sortOrder }
    }

    func loadProjects(companyId: String) async {
        // Cache hydrate first so the list renders even on a cold offline launch.
        let cached = store.cachedProjects(companyId: companyId)
        if !cached.isEmpty {
            projects = cached
        }

        isLoading = projects.isEmpty
        errorMessage = nil

        do {
            let fresh = try await service.fetchProjects(companyId: companyId)
            projects = fresh
            store.cacheProjects(fresh, companyId: companyId)
        } catch {
            // Keep showing cached data on network failure; surface error only
            // when there's nothing to display.
            if projects.isEmpty {
                errorMessage = DecodingErrorHelper.handle(error, context: "ProjectList")
            }
        }
        isLoading = false
    }
}

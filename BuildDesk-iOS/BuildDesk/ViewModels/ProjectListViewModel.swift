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
        isLoading = true
        errorMessage = nil
        do {
            projects = try await service.fetchProjects(companyId: companyId)
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "ProjectList")
        }
        isLoading = false
    }
}

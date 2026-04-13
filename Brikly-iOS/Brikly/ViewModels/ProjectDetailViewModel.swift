import Foundation
import Observation

@Observable
@MainActor
final class ProjectDetailViewModel {
    var project: Project
    var isLoading = false
    var errorMessage: String?

    private let service = ProjectService()

    init(project: Project) {
        self.project = project
    }

    /// Refresh the project from the server.
    func refresh() async {
        isLoading = true
        do {
            project = try await service.fetchProject(id: project.id)
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "ProjectDetail")
        }
        isLoading = false
    }
}

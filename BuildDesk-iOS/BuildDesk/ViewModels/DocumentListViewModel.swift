import Foundation
import Observation

@Observable
@MainActor
final class DocumentListViewModel {
    var documents: [ProjectDocument] = []
    var isLoading = false
    var errorMessage: String?

    private let service = DocumentService()

    func loadDocuments(projectId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            documents = try await service.fetchDocuments(projectId: projectId)
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "DocumentList")
        }
        isLoading = false
    }

    func signedURL(for document: ProjectDocument) async -> URL? {
        do {
            return try await service.signedURL(for: document)
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }
}

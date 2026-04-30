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

    @discardableResult
    func uploadDocument(
        bytes: Data,
        fileName: String,
        contentType: String,
        projectId: String,
        companyId: String,
        siteId: String?,
        uploadedBy: String?
    ) async -> Bool {
        errorMessage = nil
        do {
            let inserted = try await service.uploadDocument(
                bytes: bytes,
                fileName: fileName,
                contentType: contentType,
                projectId: projectId,
                companyId: companyId,
                siteId: siteId,
                uploadedBy: uploadedBy
            )
            documents.insert(inserted, at: 0)
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}

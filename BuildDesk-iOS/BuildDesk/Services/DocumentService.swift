import Foundation
import Supabase

actor DocumentService {
    private let client = SupabaseService.shared.client

    /// Fetch documents for a project.
    func fetchDocuments(projectId: String) async throws -> [ProjectDocument] {
        let response: [ProjectDocument] = try await client
            .from("documents")
            .select()
            .eq("project_id", value: projectId)
            .order("created_at", ascending: false)
            .execute()
            .value
        return response
    }

    /// Generate a signed URL for downloading/viewing a document.
    func signedURL(for document: ProjectDocument, expiresIn: Int = 3600) async throws -> URL {
        guard let path = document.filePath, !path.isEmpty else {
            throw DocumentError.noFilePath
        }

        let url = try await client.storage
            .from("documents")
            .createSignedURL(path: path, expiresIn: expiresIn)

        return url
    }

    enum DocumentError: LocalizedError {
        case noFilePath

        var errorDescription: String? {
            switch self {
            case .noFilePath:
                return "This document has no associated file."
            }
        }
    }
}

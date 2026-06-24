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

    /// Upload bytes to the `documents` storage bucket and insert a matching
    /// row in the `documents` table. Storage path is namespaced by company
    /// and project so RLS policies can isolate access.
    func uploadDocument(
        bytes: Data,
        fileName: String,
        contentType: String,
        projectId: String,
        companyId: String,
        siteId: String?,
        uploadedBy: String?
    ) async throws -> ProjectDocument {
        // companyId/projectId/timestamp-filename — keeps writes RLS-isolatable
        // and avoids collisions when the same name is uploaded twice.
        let safeName = fileName
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "\\", with: "_")
        let stamp = Int(Date().timeIntervalSince1970 * 1000)
        let storagePath = "\(companyId)/\(projectId)/\(stamp)-\(safeName)"

        _ = try await client.storage
            .from("documents")
            .upload(
                path: storagePath,
                file: bytes,
                options: FileOptions(contentType: contentType, upsert: false)
            )

        let row = NewDocument(
            companyId: companyId,
            projectId: projectId,
            siteId: siteId,
            name: fileName,
            filePath: storagePath,
            fileType: (fileName as NSString).pathExtension.lowercased(),
            fileSize: bytes.count,
            uploadedBy: uploadedBy,
            isCurrentVersion: true,
            version: 1
        )

        let response: [ProjectDocument] = try await client
            .from("documents")
            .insert(row)
            .select()
            .execute()
            .value

        guard let inserted = response.first else {
            throw DocumentError.insertFailed
        }
        return inserted
    }

    enum DocumentError: LocalizedError {
        case noFilePath
        case insertFailed

        var errorDescription: String? {
            switch self {
            case .noFilePath:
                return "This document has no associated file."
            case .insertFailed:
                return "Upload succeeded but the document record could not be created."
            }
        }
    }
}

// MARK: - Insert DTO

struct NewDocument: Codable, Sendable {
    let companyId: String
    let projectId: String
    let siteId: String?
    let name: String
    let filePath: String
    let fileType: String?
    let fileSize: Int
    let uploadedBy: String?
    let isCurrentVersion: Bool
    let version: Int

    enum CodingKeys: String, CodingKey {
        case companyId = "company_id"
        case projectId = "project_id"
        case siteId = "site_id"
        case name
        case filePath = "file_path"
        case fileType = "file_type"
        case fileSize = "file_size"
        case uploadedBy = "uploaded_by"
        case isCurrentVersion = "is_current_version"
        case version
    }
}

import Foundation
import Supabase

actor PhotoService {
    private let client = SupabaseService.shared.client

    /// Newest first, capped like the web tab.
    func list(projectId: String) async throws -> [ProjectPhoto] {
        try await client
            .from("photo_attachments")
            .select("id, file_name, file_path, storage_bucket, caption, taken_at, created_at, daily_report_id, ai_tags")
            .eq("project_id", value: projectId)
            .order("taken_at", ascending: false)
            .limit(300)
            .execute()
            .value
    }

    /// Signed URLs, one batch per bucket. The bucket is private (US-289).
    /// The batch answers per path, in order; a photo whose object is missing
    /// just gets no thumbnail.
    func signedURLs(for photos: [ProjectPhoto], expiresIn: Int = 3600) async -> [String: URL] {
        var result: [String: URL] = [:]
        for (bucket, rows) in Dictionary(grouping: photos, by: \.bucket) {
            let signed = try? await client.storage
                .from(bucket)
                .createSignedURLs(paths: rows.map(\.filePath), expiresIn: expiresIn)
            guard let signed else { continue }
            for (row, entry) in zip(rows, signed) {
                if case let .success(_, url) = entry { result[row.id] = url }
            }
        }
        return result
    }

    /// Upload one JPEG and record it. Path is `<projectId>/photos/<uuid>.jpg`,
    /// or `<projectId>/daily-reports/...` when attached to a report (the web
    /// report form's folder); the bucket policies key on the project id.
    func upload(
        jpeg: Data,
        projectId: String,
        companyId: String,
        userId: String,
        source: PhotoSource,
        caption: String?,
        dailyReportId: String?,
        takenAt: Date
    ) async throws -> ProjectPhoto {
        let folder = dailyReportId == nil ? "photos" : "daily-reports"
        let fileName = "\(UUID().uuidString.lowercased()).jpg"
        let path = "\(projectId)/\(folder)/\(fileName)"

        _ = try await client.storage
            .from(PhotoSource.bucket)
            .upload(path, data: jpeg, options: FileOptions(contentType: "image/jpeg", upsert: false))

        let row = NewProjectPhoto(
            projectId: projectId,
            companyId: companyId,
            userId: userId,
            dailyReportId: dailyReportId,
            fileName: fileName,
            filePath: path,
            fileSize: jpeg.count,
            mimeType: "image/jpeg",
            source: source.rawValue,
            caption: caption,
            takenAt: ISO8601DateFormatter().string(from: takenAt)
        )
        do {
            let inserted: [ProjectPhoto] = try await client
                .from("photo_attachments")
                .insert(row)
                .select("id, file_name, file_path, storage_bucket, caption, taken_at, created_at, daily_report_id, ai_tags")
                .execute()
                .value
            guard let photo = inserted.first else { throw ServiceError.notFound("Photo") }
            return photo
        } catch {
            // Don't leave a file nobody can find. Best effort: field roles may
            // not have delete rights on the bucket.
            _ = try? await client.storage.from(PhotoSource.bucket).remove(paths: [path])
            throw error
        }
    }

    /// Add paths to a report's legacy `photos` array (dual write, see
    /// `DailyReportPhotosUpdate`).
    func appendToReport(reportId: String, paths: [String]) async throws {
        struct Row: Decodable { let photos: [String]? }
        let rows: [Row] = try await client
            .from("daily_reports")
            .select("photos")
            .eq("id", value: reportId)
            .limit(1)
            .execute()
            .value
        let existing = rows.first?.photos ?? []
        let merged = existing + paths.filter { !existing.contains($0) }
        try await client
            .from("daily_reports")
            .update(DailyReportPhotosUpdate(photos: merged))
            .eq("id", value: reportId)
            .execute()
    }
}

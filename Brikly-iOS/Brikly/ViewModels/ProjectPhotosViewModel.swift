import Foundation
import Observation
import UIKit

struct PhotoDay: Identifiable {
    let day: Date
    let photos: [ProjectPhoto]
    var id: Date { day }
}

@Observable
@MainActor
final class ProjectPhotosViewModel {
    var photos: [ProjectPhoto] = []
    var urls: [String: URL] = [:]
    var recentReports: [DailyReport] = []
    var isLoading = false
    var errorMessage: String?
    var uploadProgress: (done: Int, total: Int)?

    private let service = PhotoService()
    private let reportService = DailyReportService()

    /// Photos grouped by the day they were taken, newest day first.
    var byDay: [PhotoDay] {
        let calendar = Calendar.current
        let groups = Dictionary(grouping: photos) { calendar.startOfDay(for: $0.sortDate) }
        return groups
            .map { PhotoDay(day: $0.key, photos: $0.value.sorted { $0.sortDate > $1.sortDate }) }
            .sorted { $0.day > $1.day }
    }

    func load(projectId: String) async {
        isLoading = photos.isEmpty
        errorMessage = nil
        defer { isLoading = false }
        do {
            photos = try await service.list(projectId: projectId)
            urls = await service.signedURLs(for: photos)
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "ProjectPhotos")
        }
        let reports = try? await reportService.fetchReports(projectId: projectId)
        if let reports { recentReports = Array(reports.prefix(14)) }
    }

    /// Upload the images one at a time so a dropped connection loses one, not
    /// all. Returns true when every image was saved.
    func upload(
        _ images: [UIImage],
        projectId: String,
        companyId: String,
        userId: String,
        source: PhotoSource,
        caption: String?,
        dailyReportId: String?
    ) async -> Bool {
        guard NetworkMonitor.shared.isOnline else {
            errorMessage = "Photos need a connection to upload."
            return false
        }
        errorMessage = nil
        uploadProgress = (0, images.count)
        defer { uploadProgress = nil }

        var saved: [ProjectPhoto] = []
        for image in images {
            guard let jpeg = PhotoProcessing.jpeg(from: image) else { continue }
            do {
                let photo = try await service.upload(
                    jpeg: jpeg,
                    projectId: projectId,
                    companyId: companyId,
                    userId: userId,
                    source: source,
                    caption: caption,
                    dailyReportId: dailyReportId,
                    takenAt: .now
                )
                saved.append(photo)
                uploadProgress = (saved.count, images.count)
            } catch {
                errorMessage = Self.describe(error)
                break
            }
        }

        if let dailyReportId, !saved.isEmpty {
            do {
                try await service.appendToReport(reportId: dailyReportId, paths: saved.map(\.filePath))
            } catch {
                // The photo rows carry daily_report_id, which is what web reads;
                // the legacy array is for older iOS builds only.
                Loggers.services.error("Daily report photo array not updated: \(error.localizedDescription, privacy: .public)")
            }
        }

        photos.insert(contentsOf: saved, at: 0)
        let newURLs = await service.signedURLs(for: saved)
        urls.merge(newURLs) { _, new in new }
        return saved.count == images.count
    }

    private static func describe(_ error: Error) -> String {
        let text = error.localizedDescription
        // Storage answers an RLS refusal with a 403 / "row-level security".
        if text.localizedCaseInsensitiveContains("row-level security") || text.contains("403") {
            return "Your role can't upload photos to this project. Ask an admin."
        }
        return "Upload stopped: \(text)"
    }
}

import Foundation

/// A row in `photo_attachments`, the one photo record web and iOS share
/// (US-330). The file lives in `storage_bucket` at `file_path`.
struct ProjectPhoto: Codable, Identifiable, Hashable, Sendable {
    let id: String
    var fileName: String
    var filePath: String
    var storageBucket: String?
    var caption: String?
    var takenAt: Date?
    let createdAt: Date
    var dailyReportId: String?
    var aiTags: [String]?

    var bucket: String { storageBucket ?? PhotoSource.bucket }
    var sortDate: Date { takenAt ?? createdAt }
}

/// `photo_attachments.source`; the column has a CHECK on exactly these.
enum PhotoSource: String, CaseIterable {
    case progress
    case dailyReport = "daily_report"
    case punchList = "punch_list"
    case safety
    case other

    static let bucket = "project-documents"

    var label: String {
        switch self {
        case .progress: "Progress"
        case .dailyReport: "Daily Report"
        case .punchList: "Punch List"
        case .safety: "Safety"
        case .other: "Other"
        }
    }
}

struct NewProjectPhoto: Codable, Sendable {
    let projectId: String
    let companyId: String
    let userId: String
    var dailyReportId: String?
    var fileName: String
    var filePath: String
    var fileSize: Int
    var mimeType: String
    var storageBucket: String = PhotoSource.bucket
    var source: String
    var caption: String?
    var takenAt: String

    enum CodingKeys: String, CodingKey {
        case projectId = "project_id"
        case companyId = "company_id"
        case userId = "user_id"
        case dailyReportId = "daily_report_id"
        case fileName = "file_name"
        case filePath = "file_path"
        case fileSize = "file_size"
        case mimeType = "mime_type"
        case storageBucket = "storage_bucket"
        case source, caption
        case takenAt = "taken_at"
    }
}

/// Appends to `daily_reports.photos`, which iOS builds at
/// MIN_SUPPORTED_IOS_VERSION still read; web writes both, and so does iOS.
struct DailyReportPhotosUpdate: Codable, Sendable {
    let photos: [String]
}

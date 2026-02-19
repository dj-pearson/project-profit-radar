import Foundation

struct ProjectDocument: Codable, Identifiable, Sendable {
    let id: String
    let companyId: String
    var projectId: String?
    var siteId: String
    var name: String
    var description: String?
    var filePath: String?
    var fileType: String?
    var fileSize: Int?
    var version: Int?
    var versionNotes: String?
    var isCurrentVersion: Bool?
    var parentDocumentId: String?
    var categoryId: String?
    var uploadedBy: String?
    var approvedBy: String?
    var approvedAt: Date?
    var checksum: String?
    var ocrText: String?
    var autoRouted: Bool?
    var routingConfidence: String?
    let createdAt: Date
    var updatedAt: Date

    /// Human-readable file size.
    var formattedSize: String {
        guard let size = fileSize else { return "—" }
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(size))
    }

    /// File extension derived from name or fileType.
    var fileExtension: String {
        if let ext = fileType, !ext.isEmpty { return ext.lowercased() }
        return (name as NSString).pathExtension.lowercased()
    }

    /// SF Symbol name for the file type.
    var iconName: String {
        switch fileExtension {
        case "pdf": "doc.fill"
        case "doc", "docx": "doc.text.fill"
        case "xls", "xlsx": "tablecells.fill"
        case "jpg", "jpeg", "png", "heic", "webp": "photo.fill"
        case "mp4", "mov": "video.fill"
        case "dwg", "dxf": "ruler.fill"
        default: "paperclip"
        }
    }
}

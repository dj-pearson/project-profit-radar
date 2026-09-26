import Foundation

struct PunchListItem: Codable, Identifiable, Hashable, Sendable {
    let id: String
    var itemNumber: String
    var description: String
    var location: String?
    var trade: String?
    var priority: String?
    var status: String?
    var category: String?
    var assignedTo: String?
    var dueDate: String?
    var dateIdentified: String?
    var dateCompleted: String?
    var projectId: String?
    let companyId: String
    var createdBy: String?
    let createdAt: Date
}

/// Status values used by `PunchList.tsx`.
enum PunchStatus: String, CaseIterable {
    case open
    case inProgress = "in_progress"
    case completed
    case verified
    case rejected

    var label: String {
        switch self {
        case .open: "Open"
        case .inProgress: "In Progress"
        case .completed: "Completed"
        case .verified: "Verified"
        case .rejected: "Rejected"
        }
    }
}

enum PunchCategory: String, CaseIterable {
    case deficiency, safety, quality, cleanup, documentation
    var label: String { rawValue.capitalized }
}

struct NewPunchListItem: Codable, Sendable {
    let companyId: String
    let projectId: String
    var description: String
    var location: String?
    var trade: String?
    var priority: String
    var category: String
    var dueDate: String?
    var status: String = PunchStatus.open.rawValue
    var itemNumber: String = RecordNumber.make("PLI")
    var createdBy: String?

    enum CodingKeys: String, CodingKey {
        case companyId = "company_id"
        case projectId = "project_id"
        case description, location, trade, priority, category, status
        case dueDate = "due_date"
        case itemNumber = "item_number"
        case createdBy = "created_by"
    }
}

struct PunchListItemUpdate: Codable, Sendable {
    var status: String?
    var dateCompleted: String?

    enum CodingKeys: String, CodingKey {
        case status
        case dateCompleted = "date_completed"
    }
}

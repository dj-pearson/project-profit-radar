import Foundation

struct RFI: Codable, Identifiable, Hashable, Sendable {
    let id: String
    var rfiNumber: String
    var subject: String
    var description: String?
    var priority: String?
    var status: String?
    var submittedTo: String?
    var dueDate: String?         // PostgreSQL `date`
    var responseDate: String?
    var projectId: String?
    let companyId: String
    var createdBy: String?
    let createdAt: Date
}

/// Status values used by `RFIs.tsx`.
enum RFIStatus: String, CaseIterable {
    case submitted
    case inProgress = "in_progress"
    case responded
    case closed
    case cancelled

    var label: String {
        switch self {
        case .submitted: "Submitted"
        case .inProgress: "In Progress"
        case .responded: "Responded"
        case .closed: "Closed"
        case .cancelled: "Cancelled"
        }
    }
}

struct NewRFI: Codable, Sendable {
    let companyId: String
    let projectId: String
    var subject: String
    var description: String?
    var priority: String
    var submittedTo: String?
    var dueDate: String?
    var status: String = RFIStatus.submitted.rawValue
    var rfiNumber: String = RecordNumber.make("RFI")
    var createdBy: String?

    enum CodingKeys: String, CodingKey {
        case companyId = "company_id"
        case projectId = "project_id"
        case subject, description, priority, status
        case submittedTo = "submitted_to"
        case dueDate = "due_date"
        case rfiNumber = "rfi_number"
        case createdBy = "created_by"
    }
}

struct RFIUpdate: Codable, Sendable {
    var status: String?
    var responseDate: String?

    enum CodingKeys: String, CodingKey {
        case status
        case responseDate = "response_date"
    }
}

import Foundation

struct Submittal: Codable, Identifiable, Hashable, Sendable {
    let id: String
    var submittalNumber: String
    var title: String
    var description: String?
    var specSection: String?
    var dueDate: String?             // PostgreSQL `date`
    var priority: String?
    var status: String?
    var submittedDate: String?
    var approvedDate: String?
    var projectId: String?
    let companyId: String
    let createdAt: Date
}

/// Status values used by `Submittals.tsx`.
enum SubmittalStatus: String, CaseIterable {
    case draft
    case submitted
    case approved
    case rejected
    case reviseResubmit = "revise_resubmit"

    var label: String {
        switch self {
        case .draft: "Draft"
        case .submitted: "Submitted"
        case .approved: "Approved"
        case .rejected: "Rejected"
        case .reviseResubmit: "Revise & Resubmit"
        }
    }
}

struct NewSubmittal: Codable, Sendable {
    let companyId: String
    let projectId: String
    var title: String
    var description: String?
    var specSection: String?
    var dueDate: String
    var priority: String
    var status: String = SubmittalStatus.draft.rawValue
    var submittalNumber: String
    var createdBy: String?

    enum CodingKeys: String, CodingKey {
        case companyId = "company_id"
        case projectId = "project_id"
        case title, description, priority, status
        case specSection = "spec_section"
        case dueDate = "due_date"
        case submittalNumber = "submittal_number"
        case createdBy = "created_by"
    }
}

import Foundation

/// Named `ProjectTask` to avoid collision with Swift's built-in `Task` type.
struct ProjectTask: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let companyId: String
    let projectId: String
    var siteId: String
    var name: String
    var description: String?
    var status: String?
    var priority: String?
    var assignedTo: String?
    var dueDate: Date?
    var startDate: Date?
    var endDate: Date?
    var completionPercentage: Double?
    var estimatedHours: Double?
    var actualHours: Double?
    var durationDays: Int?
    var isCriticalPath: Bool?
    var isMilestone: Bool?
    var milestoneType: String?
    var phaseId: String?
    var dependencies: [String]?
    var tags: [String]?
    var weatherSensitive: Bool?
    var weatherLastCheck: Date?
    var createdBy: String?
    let createdAt: Date
    var updatedAt: Date

    var displayStatus: TaskStatus {
        TaskStatus(rawValue: status ?? "") ?? .unknown
    }

    var displayPriority: TaskPriority {
        TaskPriority(rawValue: priority ?? "") ?? .medium
    }
}

enum TaskStatus: String, CaseIterable {
    case pending
    case inProgress = "in_progress"
    case completed
    case blocked
    case cancelled
    case unknown

    var label: String {
        switch self {
        case .pending: "Pending"
        case .inProgress: "In Progress"
        case .completed: "Completed"
        case .blocked: "Blocked"
        case .cancelled: "Cancelled"
        case .unknown: "Other"
        }
    }
}

enum TaskPriority: String, CaseIterable {
    case low, medium, high, urgent
    case unknown

    var label: String { rawValue.capitalized }

    var sortOrder: Int {
        switch self {
        case .urgent: 0
        case .high: 1
        case .medium: 2
        case .low: 3
        case .unknown: 4
        }
    }
}

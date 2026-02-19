import Foundation

struct Project: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let companyId: String
    var name: String
    var status: String?
    var description: String?
    var budget: Double?
    var totalBudget: Double?
    var completionPercentage: Double?
    var profitMargin: Double?
    var clientName: String?
    var clientEmail: String?
    var siteAddress: String?
    var siteLatitude: Double?
    var siteLongitude: Double?
    var siteId: String?  // Optional: may be null on older rows
    var startDate: Date?
    var endDate: Date?
    var estimatedHours: Double?
    var actualHours: Double?
    var projectType: String?
    var projectManagerId: String?
    var geofenceRadiusMeters: Double?
    var permitNumbers: [String]?
    var createdBy: String?
    var createdFrom: String?
    var opportunityId: String?
    var tenantId: String?
    let createdAt: Date
    var updatedAt: Date?  // Optional: may be null on initial row creation

    /// Display-friendly status used for UI grouping.
    var displayStatus: ProjectStatus {
        ProjectStatus(rawValue: status ?? "") ?? .unknown
    }

    var effectiveBudget: Double {
        totalBudget ?? budget ?? 0
    }
}

/// Local enum for grouping/display only. Unknown values map to `.unknown`.
enum ProjectStatus: String, CaseIterable {
    case active
    case completed
    case onHold = "on_hold"
    case planning
    case cancelled
    case unknown

    var label: String {
        switch self {
        case .active: "Active"
        case .completed: "Completed"
        case .onHold: "On Hold"
        case .planning: "Planning"
        case .cancelled: "Cancelled"
        case .unknown: "Other"
        }
    }

    var sortOrder: Int {
        switch self {
        case .active: 0
        case .planning: 1
        case .onHold: 2
        case .completed: 3
        case .cancelled: 4
        case .unknown: 5
        }
    }
}

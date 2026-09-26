import Foundation

/// A row in the `pending_timesheet_approvals` view (security_invoker, so
/// RLS on time_entries scopes it).
struct PendingTimesheet: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let userId: String
    let projectId: String
    var startTime: Date
    var endTime: Date?
    var totalHours: Double?
    var breakDuration: Double?
    var description: String?
    var approvalStatus: String?
    var workerName: String?
    var projectName: String?
    var costCode: String?
    var costCodeDescription: String?

    var displayWorker: String {
        let name = workerName?.trimmingCharacters(in: .whitespaces) ?? ""
        return name.isEmpty ? "Crew member" : name
    }
}

struct BulkTimesheetResult: Decodable, Sendable {
    let successCount: Int
    let failedCount: Int
}

/// Roles src/lib/security/types.ts gives `time_entries.approve`; the
/// database guard (20260926030000) enforces the same list.
enum TimesheetPermissions {
    static let approverRoles: Set<String> = ["admin", "project_manager", "accounting", "root_admin"]
}

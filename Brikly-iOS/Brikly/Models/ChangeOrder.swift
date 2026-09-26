import Foundation

struct ChangeOrder: Codable, Identifiable, Hashable, Sendable {
    let id: String
    var changeOrderNumber: String
    var title: String
    var description: String?
    var amount: Double
    var reason: String?
    var status: String?
    var internalApproved: Bool?
    var clientApproved: Bool?
    var approvalDueDate: String?
    var approvalNotes: String?
    var impactDays: Int?
    let projectId: String
    var createdAt: Date?

    /// Where the order sits in the two-sided approval the web app models.
    var approvalSummary: String {
        if status == "rejected" { return "Rejected" }
        switch (internalApproved == true, clientApproved == true) {
        case (true, true): return "Approved by both"
        case (true, false): return "Awaiting client"
        case (false, true): return "Awaiting internal"
        case (false, false): return "Awaiting internal and client"
        }
    }
}

/// `reason` values offered by `ChangeOrders.tsx`.
enum ChangeOrderReason: String, CaseIterable {
    case clientRequest = "client_request"
    case designChange = "design_change"
    case unforeseenConditions = "unforeseen_conditions"
    case codeRequirement = "code_requirement"
    case materialUpgrade = "material_upgrade"
    case scopeChange = "scope_change"
    case other

    var label: String {
        rawValue.replacingOccurrences(of: "_", with: " ").capitalized
    }
}

/// Roles the `change-orders` edge function lets create and approve.
enum ChangeOrderPermissions {
    static let managerRoles: Set<String> = ["admin", "project_manager", "root_admin"]
    static func canManage(role: String) -> Bool { managerRoles.contains(role) }
}

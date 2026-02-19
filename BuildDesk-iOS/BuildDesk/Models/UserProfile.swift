import Foundation

struct UserProfile: Codable, Identifiable, Sendable {
    let id: String
    let email: String
    var firstName: String?
    var lastName: String?
    var companyId: String?
    var role: String   // String, not enum — backend has 16+ roles that evolve
    var siteId: String
    var phone: String?
    var avatarUrl: String?
    var isActive: Bool?
    var tenantId: String?
    var lastLogin: Date?
    let createdAt: Date
    var updatedAt: Date

    var fullName: String {
        [firstName, lastName].compactMap { $0 }.joined(separator: " ")
    }

    var displayName: String {
        let name = fullName
        return name.isEmpty ? email : name
    }
}

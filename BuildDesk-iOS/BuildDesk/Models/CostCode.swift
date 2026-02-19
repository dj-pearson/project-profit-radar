import Foundation

struct CostCode: Codable, Identifiable, Sendable {
    let id: String
    let companyId: String
    var code: String
    var name: String
    var category: String?
    var description: String?
    var isActive: Bool?
    let createdAt: Date
    var updatedAt: Date

    /// Display string: "01-100 Concrete" format
    var displayName: String {
        "\(code) \(name)"
    }
}

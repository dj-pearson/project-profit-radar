import Foundation

/// A row in `materials`: company stock, optionally tied to one project.
struct Material: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let companyId: String
    var name: String
    var materialCode: String?
    var category: String?
    var unit: String
    var unitCost: Double?
    var quantityAvailable: Double?
    var minimumStockLevel: Double?
    var location: String?
    var supplierName: String?
    var projectId: String?
    var isActive: Bool?

    /// Same rule as the web Materials page: low once at or under the minimum.
    var isLowStock: Bool {
        guard let minimum = minimumStockLevel else { return false }
        return (quantityAvailable ?? 0) <= minimum
    }
}

/// A row in `material_usage`, with the material's name embedded.
struct MaterialUsage: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let materialId: String
    let projectId: String
    var quantityUsed: Double
    var totalCost: Double
    var dateUsed: String
    var notes: String?
    var materials: MaterialName?

    struct MaterialName: Codable, Hashable, Sendable {
        let name: String
    }
}

struct LogMaterialUsageParams: Encodable, Sendable {
    let pMaterialId: String
    let pProjectId: String
    let pQuantity: Double
    let pNotes: String?

    enum CodingKeys: String, CodingKey {
        case pMaterialId = "p_material_id"
        case pProjectId = "p_project_id"
        case pQuantity = "p_quantity"
        case pNotes = "p_notes"
    }
}

/// What `log_material_usage` returns.
struct LogMaterialUsageResult: Decodable, Sendable {
    let success: Bool
    let usageId: String?
    let quantityAvailable: Double?
    let totalCost: Double?
    let error: String?
}

import Foundation

struct JobCost: Codable, Identifiable, Sendable {
    let id: String
    let projectId: String
    var costCodeId: String
    var date: String           // PostgreSQL `date` type
    var description: String?
    var laborCost: Double?
    var laborHours: Double?
    var materialCost: Double?
    var equipmentCost: Double?
    var otherCost: Double?
    var totalCost: Double?
    var createdBy: String?
    let createdAt: Date
    var updatedAt: Date

    /// Computed total if the server-side `total_cost` is nil.
    var effectiveTotal: Double {
        if let totalCost { return totalCost }
        let labor: Double = laborCost ?? 0
        let material: Double = materialCost ?? 0
        let equipment: Double = equipmentCost ?? 0
        let other: Double = otherCost ?? 0
        return labor + material + equipment + other
    }
}

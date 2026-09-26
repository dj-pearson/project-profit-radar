import Foundation

struct SafetyIncident: Codable, Identifiable, Hashable, Sendable {
    let id: String
    var projectId: String?
    let companyId: String
    var incidentDate: String        // PostgreSQL `date`
    var incidentTime: String?
    var incidentType: String
    var severity: String
    var description: String
    var location: String?
    var injuredPersonName: String?
    var medicalAttentionRequired: Bool?
    var lostTime: Bool?
    var oshaRecordable: Bool?
    var status: String?
    let createdAt: Date
}

/// `incident_type` values used by `SafetyIncidentForm.tsx`.
enum IncidentType: String, CaseIterable {
    case injury
    case nearMiss = "near_miss"
    case propertyDamage = "property_damage"
    case environmental

    var label: String {
        switch self {
        case .injury: "Injury"
        case .nearMiss: "Near Miss"
        case .propertyDamage: "Property Damage"
        case .environmental: "Environmental"
        }
    }
}

enum IncidentSeverity: String, CaseIterable {
    case minor, moderate, severe, fatality
    var label: String { rawValue.capitalized }
}

struct NewSafetyIncident: Codable, Sendable {
    /// Device-generated so a queued retry after a lost response can't insert
    /// a second row (SyncEngine replays it as an upsert on this id).
    var id: String = UUID().uuidString.lowercased()
    let companyId: String
    let projectId: String
    var incidentDate: String
    var incidentTime: String?
    var incidentType: String
    var severity: String
    var description: String
    var location: String?
    var injuredPersonName: String?
    var bodyPartAffected: String?
    var medicalAttentionRequired: Bool
    var lostTime: Bool
    var immediateActions: String?
    var oshaRecordable: Bool
    var reportedBy: String?
    var createdBy: String?

    enum CodingKeys: String, CodingKey {
        case id
        case companyId = "company_id"
        case projectId = "project_id"
        case incidentDate = "incident_date"
        case incidentTime = "incident_time"
        case incidentType = "incident_type"
        case severity, description, location
        case injuredPersonName = "injured_person_name"
        case bodyPartAffected = "body_part_affected"
        case medicalAttentionRequired = "medical_attention_required"
        case lostTime = "lost_time"
        case immediateActions = "immediate_actions"
        case oshaRecordable = "osha_recordable"
        case reportedBy = "reported_by"
        case createdBy = "created_by"
    }
}

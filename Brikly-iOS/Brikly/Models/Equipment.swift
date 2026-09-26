import Foundation

/// A row in `equipment`. Status is free text on the server; `displayStatus`
/// folds the variants web writes (`assigned`, `checked_out`) into the four
/// the QR scan function uses.
struct Equipment: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let companyId: String
    var name: String
    var description: String?
    var equipmentType: String
    var model: String?
    var serialNumber: String?
    var purchaseDate: String?
    var purchaseCost: Double?
    var currentValue: Double?
    var location: String?
    var status: String?
    var maintenanceSchedule: String?
    var lastMaintenanceDate: String?
    var nextMaintenanceDate: String?
    var isActive: Bool?
    let createdAt: Date

    var displayStatus: EquipmentStatus {
        switch status ?? "available" {
        case "in_use", "assigned", "checked_out": .inUse
        case "maintenance": .maintenance
        case "out_of_service": .outOfService
        default: .available
        }
    }

    /// True when the next maintenance date has passed.
    var isMaintenanceDue: Bool {
        guard let next = nextMaintenanceDate else { return false }
        return String(next.prefix(10)) < DateFormatting.localISODate(.now)
    }
}

enum EquipmentStatus: String, CaseIterable {
    case available
    case inUse = "in_use"
    case maintenance
    case outOfService = "out_of_service"

    var label: String {
        switch self {
        case .available: "Available"
        case .inUse: "In Use"
        case .maintenance: "Maintenance"
        case .outOfService: "Out of Service"
        }
    }
}

// MARK: - Maintenance

/// A row in `equipment_maintenance_records`. `work_order_number` is filled by
/// a trigger (`WO-YYYY-NNNN`).
struct MaintenanceRecord: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let equipmentId: String
    var workOrderNumber: String?
    var maintenanceType: String
    var taskName: String
    var workPerformed: String
    var scheduledDate: String?
    var actualCompletionDate: String?
    var totalLaborHours: Double?
    var totalCost: Double?
    var vendorName: String?
    var conditionAfter: String?
    var hourMeterReading: Double?
    var issuesFound: String?
    var followUpRequired: Bool?
    var followUpDate: String?
    let createdAt: Date

    var isComplete: Bool { actualCompletionDate != nil }
}

/// `maintenance_type` CHECK values.
enum MaintenanceType: String, CaseIterable {
    case preventive, corrective, emergency, inspection, calibration, overhaul, seasonal
    var label: String { rawValue.capitalized }
}

/// `condition_after` CHECK values.
enum MaintenanceCondition: String, CaseIterable {
    case excellent, good, fair, poor
    case needsFollowup = "needs_followup"
    var label: String { self == .needsFollowup ? "Needs Follow-up" : rawValue.capitalized }
}

struct NewMaintenanceRecord: Codable, Sendable {
    let equipmentId: String
    let companyId: String
    var maintenanceType: String
    var taskName: String
    var workPerformed: String
    var actualCompletionDate: String?
    var totalLaborHours: Double?
    var laborCost: Double?
    var partsCost: Double?
    var totalCost: Double?
    var vendorName: String?
    var conditionAfter: String?
    var hourMeterReading: Double?
    var issuesFound: String?
    var followUpRequired: Bool
    var followUpDate: String?
    var performedBy: String?
    var createdBy: String?

    enum CodingKeys: String, CodingKey {
        case equipmentId = "equipment_id"
        case companyId = "company_id"
        case maintenanceType = "maintenance_type"
        case taskName = "task_name"
        case workPerformed = "work_performed"
        case actualCompletionDate = "actual_completion_date"
        case totalLaborHours = "total_labor_hours"
        case laborCost = "labor_cost"
        case partsCost = "parts_cost"
        case totalCost = "total_cost"
        case vendorName = "vendor_name"
        case conditionAfter = "condition_after"
        case hourMeterReading = "hour_meter_reading"
        case issuesFound = "issues_found"
        case followUpRequired = "follow_up_required"
        case followUpDate = "follow_up_date"
        case performedBy = "performed_by"
        case createdBy = "created_by"
    }
}

// MARK: - Assignments

/// A row in `equipment_assignments`: equipment booked to a project for a
/// date range. Separate from QR check-out, as on web.
struct EquipmentAssignment: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let equipmentId: String
    let projectId: String
    var startDate: String
    var endDate: String
    var actualEndDate: String?
    var assignmentStatus: String?
    var assignedQuantity: Double?
    var notes: String?

    var isOpen: Bool {
        let status = assignmentStatus ?? "planned"
        return status != "completed" && status != "cancelled"
    }
}

struct NewEquipmentAssignment: Codable, Sendable {
    let companyId: String
    let equipmentId: String
    let projectId: String
    var startDate: String
    var endDate: String
    var assignmentStatus: String
    var assignedQuantity: Double = 1
    var notes: String?
    var assignedBy: String?

    enum CodingKeys: String, CodingKey {
        case companyId = "company_id"
        case equipmentId = "equipment_id"
        case projectId = "project_id"
        case startDate = "start_date"
        case endDate = "end_date"
        case assignmentStatus = "assignment_status"
        case assignedQuantity = "assigned_quantity"
        case notes
        case assignedBy = "assigned_by"
    }
}

/// The return update web makes (`EquipmentAssignmentsTab.tsx`).
struct EquipmentReturnUpdate: Codable, Sendable {
    let actualEndDate: String
    var assignmentStatus = "completed"

    enum CodingKeys: String, CodingKey {
        case actualEndDate = "actual_end_date"
        case assignmentStatus = "assignment_status"
    }
}

// MARK: - QR

/// `equipment_scan_events.scan_type` CHECK values offered on the phone.
enum EquipmentScanType: String, CaseIterable {
    case checkOut = "check_out"
    case checkIn = "check_in"
    case inspection
    case locationUpdate = "location_update"

    var label: String {
        switch self {
        case .checkOut: "Check Out"
        case .checkIn: "Check In"
        case .inspection: "Inspection"
        case .locationUpdate: "Update Location"
        }
    }
}

/// `equipment_scan_events.condition_rating` CHECK values.
enum ScanCondition: String, CaseIterable {
    case excellent, good, fair, poor
    case needsRepair = "needs_repair"
    var label: String { self == .needsRepair ? "Needs Repair" : rawValue.capitalized }
}

/// The JSON a Brikly equipment label encodes (`generate_equipment_qr_code`).
/// Parsed only to reject a foreign or non-Brikly code before calling the
/// server; the server looks the raw string up itself.
struct EquipmentLabel: Decodable {
    let equipmentId: String
    let companyId: String
    let name: String?
    let type: String?
    let version: String?

    static func parse(_ raw: String) -> EquipmentLabel? {
        guard let data = raw.data(using: .utf8),
              let label = try? JSONDecoder().decode(EquipmentLabel.self, from: data),
              label.type == "equipment_checkout" else { return nil }
        return label
    }
}

struct EquipmentScanParams: Encodable, Sendable {
    let pQrCodeValue: String
    let pScanType: String
    var pLatitude: Double?
    var pLongitude: Double?
    var pAccuracy: Double?
    var pLocationDescription: String?
    var pProjectId: String?
    var pConditionRating: String?
    var pHoursReading: Double?
    var pFuelLevel: Double?
    var pNotes: String?

    enum CodingKeys: String, CodingKey {
        case pQrCodeValue = "p_qr_code_value"
        case pScanType = "p_scan_type"
        case pLatitude = "p_latitude"
        case pLongitude = "p_longitude"
        case pAccuracy = "p_accuracy"
        case pLocationDescription = "p_location_description"
        case pProjectId = "p_project_id"
        case pConditionRating = "p_condition_rating"
        case pHoursReading = "p_hours_reading"
        case pFuelLevel = "p_fuel_level"
        case pNotes = "p_notes"
    }
}

struct EquipmentScanResult: Decodable, Sendable {
    let success: Bool
    let equipmentId: String?
    let equipmentName: String?
    let newStatus: String?
    let message: String?
    let error: String?
}

struct GenerateQRResult: Decodable, Sendable {
    let success: Bool
    let qrCodeValue: String?
    let error: String?
}

/// Who may change equipment records, per the RLS policies.
enum EquipmentPermissions {
    /// `equipment_maintenance_records` manage policy.
    static let maintenanceRoles: Set<String> = ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"]
    /// `equipment_assignments` manage policy.
    static let assignmentRoles: Set<String> = ["admin", "project_manager", "field_supervisor", "root_admin"]
}

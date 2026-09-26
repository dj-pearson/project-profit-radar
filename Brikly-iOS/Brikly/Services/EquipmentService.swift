import Foundation
import Supabase

actor EquipmentService {
    private let client = SupabaseService.shared.client

    func list(companyId: String) async throws -> [Equipment] {
        try await client
            .from("equipment")
            .select()
            .eq("company_id", value: companyId)
            .order("name", ascending: true)
            .execute()
            .value
    }

    func equipment(id: String) async throws -> Equipment? {
        let rows: [Equipment] = try await client
            .from("equipment")
            .select()
            .eq("id", value: id)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    func maintenance(equipmentId: String) async throws -> [MaintenanceRecord] {
        try await client
            .from("equipment_maintenance_records")
            .select()
            .eq("equipment_id", value: equipmentId)
            .order("created_at", ascending: false)
            .limit(50)
            .execute()
            .value
    }

    func logMaintenance(_ record: NewMaintenanceRecord) async throws -> MaintenanceRecord {
        let rows: [MaintenanceRecord] = try await client
            .from("equipment_maintenance_records")
            .insert(record)
            .select()
            .execute()
            .value
        guard let row = rows.first else { throw ServiceError.notFound("Maintenance record") }
        return row
    }

    func assignments(equipmentId: String) async throws -> [EquipmentAssignment] {
        try await client
            .from("equipment_assignments")
            .select()
            .eq("equipment_id", value: equipmentId)
            .order("start_date", ascending: false)
            .limit(50)
            .execute()
            .value
    }

    func assign(_ assignment: NewEquipmentAssignment) async throws -> EquipmentAssignment {
        let rows: [EquipmentAssignment] = try await client
            .from("equipment_assignments")
            .insert(assignment)
            .select()
            .execute()
            .value
        guard let row = rows.first else { throw ServiceError.notFound("Assignment") }
        return row
    }

    func returnAssignment(id: String) async throws -> EquipmentAssignment {
        let rows: [EquipmentAssignment] = try await client
            .from("equipment_assignments")
            .update(EquipmentReturnUpdate(actualEndDate: DateFormatting.localISODate(.now)))
            .eq("id", value: id)
            .select()
            .execute()
            .value
        guard let row = rows.first else { throw ServiceError.notFound("Assignment") }
        return row
    }

    /// The active label value for a piece of equipment, if one was generated.
    func qrValue(equipmentId: String) async throws -> String? {
        struct Row: Decodable { let qrCodeValue: String }
        let rows: [Row] = try await client
            .from("equipment_qr_codes")
            .select("qr_code_value")
            .eq("equipment_id", value: equipmentId)
            .eq("is_active", value: true)
            .limit(1)
            .execute()
            .value
        return rows.first?.qrCodeValue
    }

    /// Returns the existing active label or creates one.
    func generateQR(equipmentId: String) async throws -> GenerateQRResult {
        struct Params: Encodable, Sendable {
            let pEquipmentId: String
            enum CodingKeys: String, CodingKey { case pEquipmentId = "p_equipment_id" }
        }
        return try await client
            .rpc("generate_equipment_qr_code", params: Params(pEquipmentId: equipmentId))
            .execute()
            .value
    }

    func scan(_ params: EquipmentScanParams) async throws -> EquipmentScanResult {
        try await client
            .rpc("process_equipment_qr_scan", params: params)
            .execute()
            .value
    }
}

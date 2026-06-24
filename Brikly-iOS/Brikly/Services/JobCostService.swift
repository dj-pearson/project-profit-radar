import Foundation
import Supabase
import Realtime

actor JobCostService {
    private let client = SupabaseService.shared.client

    /// Fetch job costs for a project.
    func fetchJobCosts(projectId: String) async throws -> [JobCost] {
        let response: [JobCost] = try await client
            .from("job_costs")
            .select()
            .eq("project_id", value: projectId)
            .order("date", ascending: false)
            .execute()
            .value
        return response
    }

    /// Fetch all active cost codes for a company.
    func fetchCostCodes(companyId: String) async throws -> [CostCode] {
        let response: [CostCode] = try await client
            .from("cost_codes")
            .select()
            .eq("company_id", value: companyId)
            .eq("is_active", value: true)
            .order("code")
            .execute()
            .value
        return response
    }

    /// Create a new job cost entry.
    func createJobCost(_ cost: NewJobCost) async throws -> JobCost {
        let response: [JobCost] = try await client
            .from("job_costs")
            .insert(cost)
            .select()
            .execute()
            .value

        guard let created = response.first else {
            throw ServiceError.notFound("Job Cost")
        }
        return created
    }

    /// Update an existing job cost.
    func updateJobCost(id: String, updates: JobCostUpdate) async throws -> JobCost {
        let response: [JobCost] = try await client
            .from("job_costs")
            .update(updates)
            .eq("id", value: id)
            .select()
            .execute()
            .value

        guard let updated = response.first else {
            throw ServiceError.notFound("Job Cost")
        }
        return updated
    }

    /// Subscribe to realtime changes on job_costs for a given project.
    func realtimeChannel(projectId: String) -> RealtimeChannelV2 {
        client.realtimeV2.channel("job_costs_\(projectId)") {
            $0.broadcast.receiveOwnBroadcasts = false
        }
    }
}

// MARK: - Insert/Update DTOs

struct NewJobCost: Codable, Sendable {
    let projectId: String
    var costCodeId: String
    var date: String                    // "yyyy-MM-dd"
    var description: String?
    var laborCost: Double?
    var laborHours: Double?
    var materialCost: Double?
    var equipmentCost: Double?
    var otherCost: Double?

    enum CodingKeys: String, CodingKey {
        case projectId = "project_id"
        case costCodeId = "cost_code_id"
        case date, description
        case laborCost = "labor_cost"
        case laborHours = "labor_hours"
        case materialCost = "material_cost"
        case equipmentCost = "equipment_cost"
        case otherCost = "other_cost"
    }
}

struct JobCostUpdate: Codable, Sendable {
    var costCodeId: String?
    var description: String?
    var laborCost: Double?
    var laborHours: Double?
    var materialCost: Double?
    var equipmentCost: Double?
    var otherCost: Double?

    enum CodingKeys: String, CodingKey {
        case costCodeId = "cost_code_id"
        case description
        case laborCost = "labor_cost"
        case laborHours = "labor_hours"
        case materialCost = "material_cost"
        case equipmentCost = "equipment_cost"
        case otherCost = "other_cost"
    }
}

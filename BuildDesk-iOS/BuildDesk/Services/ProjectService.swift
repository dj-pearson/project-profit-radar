import Foundation
import Supabase

actor ProjectService {
    private let client = SupabaseService.shared.client

    /// Fetch all projects for a company.
    func fetchProjects(companyId: String) async throws -> [Project] {
        let response: [Project] = try await client
            .from("projects")
            .select()
            .eq("company_id", value: companyId)
            .order("updated_at", ascending: false)
            .execute()
            .value
        return response
    }

    /// Fetch a single project by ID.
    func fetchProject(id: String) async throws -> Project {
        let response: [Project] = try await client
            .from("projects")
            .select()
            .eq("id", value: id)
            .limit(1)
            .execute()
            .value

        guard let project = response.first else {
            throw ServiceError.notFound("Project")
        }
        return project
    }
}

enum ServiceError: LocalizedError {
    case notFound(String)

    var errorDescription: String? {
        switch self {
        case .notFound(let entity):
            return "\(entity) not found."
        }
    }
}

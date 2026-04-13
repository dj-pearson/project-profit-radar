import Foundation
import Supabase

actor TaskService {
    private let client = SupabaseService.shared.client

    /// Fetch tasks for a project.
    func fetchTasks(projectId: String) async throws -> [ProjectTask] {
        let response: [ProjectTask] = try await client
            .from("tasks")
            .select()
            .eq("project_id", value: projectId)
            .order("created_at", ascending: false)
            .execute()
            .value
        return response
    }

    /// Create a new task.
    func createTask(_ task: NewTask) async throws -> ProjectTask {
        let response: [ProjectTask] = try await client
            .from("tasks")
            .insert(task)
            .select()
            .execute()
            .value

        guard let created = response.first else {
            throw ServiceError.notFound("Task")
        }
        return created
    }

    /// Update an existing task.
    func updateTask(id: String, updates: TaskUpdate) async throws -> ProjectTask {
        let response: [ProjectTask] = try await client
            .from("tasks")
            .update(updates)
            .eq("id", value: id)
            .select()
            .execute()
            .value

        guard let updated = response.first else {
            throw ServiceError.notFound("Task")
        }
        return updated
    }
}

// MARK: - Insert/Update DTOs

struct NewTask: Codable, Sendable {
    let companyId: String
    let projectId: String
    let siteId: String
    var name: String
    var description: String?
    var status: String?
    var priority: String?
    var assignedTo: String?
    var dueDate: String?           // "yyyy-MM-dd" string
    var completionPercentage: Double?

    enum CodingKeys: String, CodingKey {
        case companyId = "company_id"
        case projectId = "project_id"
        case siteId = "site_id"
        case name, description, status, priority
        case assignedTo = "assigned_to"
        case dueDate = "due_date"
        case completionPercentage = "completion_percentage"
    }
}

struct TaskUpdate: Codable, Sendable {
    var name: String?
    var description: String?
    var status: String?
    var priority: String?
    var assignedTo: String?
    var dueDate: String?
    var completionPercentage: Double?

    enum CodingKeys: String, CodingKey {
        case name, description, status, priority
        case assignedTo = "assigned_to"
        case dueDate = "due_date"
        case completionPercentage = "completion_percentage"
    }
}

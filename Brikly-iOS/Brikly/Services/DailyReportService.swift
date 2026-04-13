import Foundation
import Supabase

actor DailyReportService {
    private let client = SupabaseService.shared.client

    /// Fetch daily reports for a project, newest first.
    func fetchReports(projectId: String) async throws -> [DailyReport] {
        let response: [DailyReport] = try await client
            .from("daily_reports")
            .select()
            .eq("project_id", value: projectId)
            .order("date", ascending: false)
            .execute()
            .value
        return response
    }

    /// Create a new daily report.
    func createReport(_ report: NewDailyReport) async throws -> DailyReport {
        let response: [DailyReport] = try await client
            .from("daily_reports")
            .insert(report)
            .select()
            .execute()
            .value

        guard let created = response.first else {
            throw ServiceError.notFound("Daily Report")
        }
        return created
    }

    /// Update an existing daily report.
    func updateReport(id: String, updates: DailyReportUpdate) async throws -> DailyReport {
        let response: [DailyReport] = try await client
            .from("daily_reports")
            .update(updates)
            .eq("id", value: id)
            .select()
            .execute()
            .value

        guard let updated = response.first else {
            throw ServiceError.notFound("Daily Report")
        }
        return updated
    }
}

// MARK: - Insert/Update DTOs

struct NewDailyReport: Codable, Sendable {
    let projectId: String
    let siteId: String
    var companyId: String?
    var date: String                  // "yyyy-MM-dd"
    var crewCount: Int?
    var weatherConditions: String?
    var temperature: Double?
    var workPerformed: String?
    var delaysIssues: String?
    var safetyIncidents: String?
    var nextDayPlan: String?

    enum CodingKeys: String, CodingKey {
        case projectId = "project_id"
        case siteId = "site_id"
        case companyId = "company_id"
        case date
        case crewCount = "crew_count"
        case weatherConditions = "weather_conditions"
        case temperature
        case workPerformed = "work_performed"
        case delaysIssues = "delays_issues"
        case safetyIncidents = "safety_incidents"
        case nextDayPlan = "next_day_plan"
    }
}

struct DailyReportUpdate: Codable, Sendable {
    var crewCount: Int?
    var weatherConditions: String?
    var temperature: Double?
    var workPerformed: String?
    var delaysIssues: String?
    var safetyIncidents: String?
    var nextDayPlan: String?

    enum CodingKeys: String, CodingKey {
        case crewCount = "crew_count"
        case weatherConditions = "weather_conditions"
        case temperature
        case workPerformed = "work_performed"
        case delaysIssues = "delays_issues"
        case safetyIncidents = "safety_incidents"
        case nextDayPlan = "next_day_plan"
    }
}

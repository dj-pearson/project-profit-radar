import Foundation
import Supabase

actor TimeEntryService {
    private let client = SupabaseService.shared.client

    /// The user's open entry (no `end_time`), if any. Not limited to today:
    /// a shift left running overnight still has to be clocked out.
    func fetchOpenEntry(userId: String) async throws -> TimeEntry? {
        let response: [TimeEntry] = try await client
            .from("time_entries")
            .select()
            .eq("user_id", value: userId)
            .is("end_time", value: nil)
            .order("start_time", ascending: false)
            .limit(1)
            .execute()
            .value
        return response.first
    }

    /// The user's entries that started on or after `since`, newest first.
    func fetchEntries(userId: String, since: Date) async throws -> [TimeEntry] {
        let response: [TimeEntry] = try await client
            .from("time_entries")
            .select()
            .eq("user_id", value: userId)
            .gte("start_time", value: ISO8601DateFormatter().string(from: since))
            .order("start_time", ascending: false)
            .execute()
            .value
        return response
    }

    func create(_ entry: NewTimeEntry) async throws -> TimeEntry {
        let response: [TimeEntry] = try await client
            .from("time_entries")
            .insert(entry)
            .select()
            .execute()
            .value
        guard let created = response.first else { throw ServiceError.notFound("Time entry") }
        return created
    }

    func update(id: String, _ updates: TimeEntryUpdate) async throws -> TimeEntry {
        let response: [TimeEntry] = try await client
            .from("time_entries")
            .update(updates)
            .eq("id", value: id)
            .select()
            .execute()
            .value
        guard let updated = response.first else { throw ServiceError.notFound("Time entry") }
        return updated
    }

    /// Cost codes for the clock-in picker: the project's budgeted codes first,
    /// then every other active code. Mirrors `MobileTimeClock.tsx`.
    func costCodes(projectId: String, companyId: String) async throws -> [CostCode] {
        async let budgetRows: [ProjectBudgetLine] = client
            .from("project_budgets")
            .select("cost_code_id")
            .eq("project_id", value: projectId)
            .execute()
            .value
        async let codes: [CostCode] = client
            .from("cost_codes")
            .select()
            .eq("company_id", value: companyId)
            .eq("is_active", value: true)
            .order("code")
            .execute()
            .value

        let budgetedRows = try await budgetRows
        let all = try await codes
        let budgeted = Set(budgetedRows.map(\.costCodeId))
        return all.filter { budgeted.contains($0.id) } + all.filter { !budgeted.contains($0.id) }
    }
}

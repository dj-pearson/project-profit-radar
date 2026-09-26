import Foundation
import Supabase

/// Plain PostgREST reads and writes for the project records that don't need
/// their own service (RFIs, punch list, safety, expenses, submittals,
/// notifications). RLS scopes every table by company.
actor RecordService {
    private let client = SupabaseService.shared.client

    /// Rows for one project, newest first by `orderBy`.
    func list<T: Decodable & Sendable>(
        _ table: String,
        projectId: String,
        orderBy: String = "created_at"
    ) async throws -> [T] {
        try await client
            .from(table)
            .select()
            .eq("project_id", value: projectId)
            .order(orderBy, ascending: false)
            .execute()
            .value
    }

    /// Company-wide row count, for sequence-style numbers such as
    /// `SUB-2026-004` that the web app derives from the existing total.
    func count(_ table: String, companyId: String) async throws -> Int {
        let response = try await client
            .from(table)
            .select("id", head: true, count: .exact)
            .eq("company_id", value: companyId)
            .execute()
        return response.count ?? 0
    }

    func insert<T: Decodable & Sendable, Body: Encodable & Sendable>(
        _ table: String,
        _ body: Body
    ) async throws -> T {
        let response: [T] = try await client
            .from(table)
            .insert(body)
            .select()
            .execute()
            .value
        guard let created = response.first else { throw ServiceError.notFound(table) }
        return created
    }

    func update<T: Decodable & Sendable, Body: Encodable & Sendable>(
        _ table: String,
        id: String,
        _ body: Body
    ) async throws -> T {
        let response: [T] = try await client
            .from(table)
            .update(body)
            .eq("id", value: id)
            .select()
            .execute()
            .value
        guard let updated = response.first else { throw ServiceError.notFound(table) }
        return updated
    }
}

/// Record numbers in the web app's format: a prefix plus the last eight
/// digits of the current epoch milliseconds (`RFI-12345678`, `PLI-...`).
enum RecordNumber {
    static func make(_ prefix: String) -> String {
        let millis = String(Int(Date().timeIntervalSince1970 * 1000))
        return "\(prefix)-\(millis.suffix(8))"
    }
}

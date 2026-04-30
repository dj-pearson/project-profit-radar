import Foundation
import SwiftData

// MARK: - SwiftData models

/// Local cache of a daily report. Stores the full JSON-encoded report as a
/// blob so the schema can evolve server-side without forcing a SwiftData
/// migration. Index fields (`id`, `projectId`, `date`) are extracted for fast
/// query and sort.
@Model
final class LocalDailyReport {
    @Attribute(.unique) var id: String
    var projectId: String
    var date: String              // yyyy-MM-dd — used for sort
    var payload: Data             // JSON-encoded `DailyReport`
    var lastSyncedAt: Date

    init(id: String, projectId: String, date: String, payload: Data, lastSyncedAt: Date = .now) {
        self.id = id
        self.projectId = projectId
        self.date = date
        self.payload = payload
        self.lastSyncedAt = lastSyncedAt
    }
}

/// Local cache of a project. Used to keep the project list visible offline
/// after at least one online fetch.
@Model
final class LocalProject {
    @Attribute(.unique) var id: String
    var companyId: String
    var name: String
    var status: String?
    var payload: Data             // JSON-encoded `Project`
    var lastSyncedAt: Date

    init(id: String, companyId: String, name: String, status: String?, payload: Data, lastSyncedAt: Date = .now) {
        self.id = id
        self.companyId = companyId
        self.name = name
        self.status = status
        self.payload = payload
        self.lastSyncedAt = lastSyncedAt
    }
}

/// A queued write that hasn't been confirmed by the server yet. The
/// `idempotencyKey` is generated client-side and included in the request so
/// the backend can deduplicate on retry. `entityType` identifies the table
/// being mutated; `operation` is "create" or "update".
@Model
final class PendingMutation {
    @Attribute(.unique) var id: String
    var entityType: String
    var operation: String
    var entityId: String?         // present for updates; nil for creates
    var payload: Data             // JSON body
    var queuedAt: Date
    var attempts: Int
    var lastError: String?
    var idempotencyKey: String

    init(
        id: String = UUID().uuidString,
        entityType: String,
        operation: String,
        entityId: String?,
        payload: Data,
        queuedAt: Date = .now,
        attempts: Int = 0,
        lastError: String? = nil,
        idempotencyKey: String = UUID().uuidString
    ) {
        self.id = id
        self.entityType = entityType
        self.operation = operation
        self.entityId = entityId
        self.payload = payload
        self.queuedAt = queuedAt
        self.attempts = attempts
        self.lastError = lastError
        self.idempotencyKey = idempotencyKey
    }
}

// MARK: - OfflineStore

/// Owns the SwiftData container and exposes the typed helpers each
/// ViewModel uses. All access is on the MainActor — SwiftData's
/// `ModelContext` is not Sendable, and SwiftUI views observe via @Query.
@MainActor
final class OfflineStore {
    static let shared = OfflineStore()

    let container: ModelContainer
    var context: ModelContext { container.mainContext }

    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    private init() {
        let schema = Schema([
            LocalDailyReport.self,
            LocalProject.self,
            PendingMutation.self,
        ])
        // Local-only — no CloudKit. Construction crews don't expect device-to-device sync;
        // the server is the source of truth.
        let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            self.container = try ModelContainer(for: schema, configurations: [config])
        } catch {
            // SwiftData container creation only fails on schema/disk issues that
            // are not recoverable. Crash early — better than silently losing data.
            fatalError("OfflineStore: ModelContainer init failed: \(error)")
        }

        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        e.dateEncodingStrategy = .iso8601
        encoder = e

        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        d.dateDecodingStrategy = PostgresDateDecoding.strategy
        decoder = d
    }

    // MARK: Daily reports

    /// Replace the cached set for a project with the supplied authoritative server list.
    func cacheDailyReports(_ reports: [DailyReport], projectId: String) {
        // Delete any cached rows for this project that are no longer on the server.
        let existingIds = Set(reports.map(\.id))
        let predicate = #Predicate<LocalDailyReport> { $0.projectId == projectId }
        let descriptor = FetchDescriptor<LocalDailyReport>(predicate: predicate)
        if let cached = try? context.fetch(descriptor) {
            for row in cached where !existingIds.contains(row.id) {
                context.delete(row)
            }
        }

        for report in reports {
            upsertDailyReport(report)
        }
        try? context.save()
    }

    /// Insert or update a single report in the cache.
    func upsertDailyReport(_ report: DailyReport) {
        let id = report.id
        let predicate = #Predicate<LocalDailyReport> { $0.id == id }
        let descriptor = FetchDescriptor<LocalDailyReport>(predicate: predicate)
        let payload = (try? encoder.encode(report)) ?? Data()

        if let existing = try? context.fetch(descriptor).first {
            existing.projectId = report.projectId
            existing.date = report.date
            existing.payload = payload
            existing.lastSyncedAt = .now
        } else {
            let row = LocalDailyReport(
                id: report.id,
                projectId: report.projectId,
                date: report.date,
                payload: payload
            )
            context.insert(row)
        }
        try? context.save()
    }

    /// Fetch cached daily reports for a project, newest-first (by `date`).
    func cachedDailyReports(projectId: String) -> [DailyReport] {
        let predicate = #Predicate<LocalDailyReport> { $0.projectId == projectId }
        var descriptor = FetchDescriptor<LocalDailyReport>(
            predicate: predicate,
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        descriptor.fetchLimit = 500
        guard let rows = try? context.fetch(descriptor) else { return [] }
        return rows.compactMap { row in
            try? decoder.decode(DailyReport.self, from: row.payload)
        }
    }

    // MARK: Projects

    func cacheProjects(_ projects: [Project], companyId: String) {
        let existingIds = Set(projects.map(\.id))
        let predicate = #Predicate<LocalProject> { $0.companyId == companyId }
        let descriptor = FetchDescriptor<LocalProject>(predicate: predicate)
        if let cached = try? context.fetch(descriptor) {
            for row in cached where !existingIds.contains(row.id) {
                context.delete(row)
            }
        }

        for project in projects {
            upsertProject(project)
        }
        try? context.save()
    }

    func upsertProject(_ project: Project) {
        let id = project.id
        let predicate = #Predicate<LocalProject> { $0.id == id }
        let descriptor = FetchDescriptor<LocalProject>(predicate: predicate)
        let payload = (try? encoder.encode(project)) ?? Data()

        if let existing = try? context.fetch(descriptor).first {
            existing.companyId = project.companyId
            existing.name = project.name
            existing.status = project.status
            existing.payload = payload
            existing.lastSyncedAt = .now
        } else {
            let row = LocalProject(
                id: project.id,
                companyId: project.companyId,
                name: project.name,
                status: project.status,
                payload: payload
            )
            context.insert(row)
        }
        try? context.save()
    }

    func cachedProjects(companyId: String) -> [Project] {
        let predicate = #Predicate<LocalProject> { $0.companyId == companyId }
        let descriptor = FetchDescriptor<LocalProject>(predicate: predicate)
        guard let rows = try? context.fetch(descriptor) else { return [] }
        return rows.compactMap { row in
            try? decoder.decode(Project.self, from: row.payload)
        }
    }

    // MARK: Pending mutations

    /// Enqueue a write to be replayed when the network is reachable.
    @discardableResult
    func enqueue<Body: Encodable>(
        entityType: String,
        operation: String,
        entityId: String? = nil,
        body: Body
    ) -> PendingMutation {
        let payload = (try? encoder.encode(body)) ?? Data()
        let mutation = PendingMutation(
            entityType: entityType,
            operation: operation,
            entityId: entityId,
            payload: payload
        )
        context.insert(mutation)
        try? context.save()
        return mutation
    }

    /// Pending mutations sorted oldest-first so retries respect ordering
    /// within an entity (e.g. create-then-update).
    func pendingMutations() -> [PendingMutation] {
        let descriptor = FetchDescriptor<PendingMutation>(
            sortBy: [SortDescriptor(\.queuedAt, order: .forward)]
        )
        return (try? context.fetch(descriptor)) ?? []
    }

    /// Remove a mutation after it has been confirmed by the server.
    func remove(_ mutation: PendingMutation) {
        context.delete(mutation)
        try? context.save()
    }

    /// Mark a failed attempt; bumps the counter and stores the error.
    func recordFailure(_ mutation: PendingMutation, error: String) {
        mutation.attempts += 1
        mutation.lastError = error
        try? context.save()
    }

    var pendingCount: Int {
        let descriptor = FetchDescriptor<PendingMutation>()
        return (try? context.fetchCount(descriptor)) ?? 0
    }
}

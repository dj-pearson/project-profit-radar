import Foundation
import Observation

enum SaveOutcome {
    case saved
    /// Written to the offline queue; `SyncEngine` replays it on reconnect.
    case queued
    case failed
}

/// List + create + update for one project-scoped table. Used by RFIs, punch
/// list, safety incidents, expenses and submittals, which share the same
/// shape: load the project's rows, add one, change a status.
///
/// Tables listed in `SyncEngine.genericTables` can be written offline by
/// passing `offlineEntity`; the write is queued and the list shows it after
/// the next sync. Others surface the error instead.
@Observable
@MainActor
final class RecordListViewModel<Record: Decodable & Sendable & Identifiable> where Record.ID == String {
    var records: [Record] = []
    var isLoading = false
    var errorMessage: String?
    var notice: String?

    let table: String
    private let orderBy: String
    private let service = RecordService()

    init(table: String, orderBy: String = "created_at") {
        self.table = table
        self.orderBy = orderBy
    }

    func load(projectId: String) async {
        isLoading = records.isEmpty
        errorMessage = nil
        defer { isLoading = false }
        do {
            records = try await service.list(table, projectId: projectId, orderBy: orderBy)
        } catch {
            if records.isEmpty {
                errorMessage = DecodingErrorHelper.handle(error, context: "RecordList.\(table)")
            }
        }
    }

    @discardableResult
    func create<Body: Encodable & Sendable>(_ body: Body, offlineEntity: String? = nil) async -> SaveOutcome {
        notice = nil
        if NetworkMonitor.shared.isOnline {
            do {
                let created: Record = try await service.insert(table, body)
                records.insert(created, at: 0)
                return .saved
            } catch {
                if offlineEntity == nil {
                    errorMessage = error.localizedDescription
                    return .failed
                }
                CrashReporter.breadcrumb("\(table) create failure -> enqueue", category: "sync")
            }
        }
        guard let offlineEntity else {
            errorMessage = "You're offline. Try again when you have a connection."
            return .failed
        }
        OfflineStore.shared.enqueue(entityType: offlineEntity, operation: "create", body: body)
        notice = "Saved on this device. It syncs when you're back online."
        return .queued
    }

    @discardableResult
    func update<Body: Encodable & Sendable>(id: String, _ body: Body, offlineEntity: String? = nil) async -> SaveOutcome {
        notice = nil
        if NetworkMonitor.shared.isOnline {
            do {
                let updated: Record = try await service.update(table, id: id, body)
                if let index = records.firstIndex(where: { $0.id == id }) {
                    records[index] = updated
                }
                return .saved
            } catch {
                if offlineEntity == nil {
                    errorMessage = error.localizedDescription
                    return .failed
                }
                CrashReporter.breadcrumb("\(table) update failure -> enqueue", category: "sync")
            }
        }
        guard let offlineEntity else {
            errorMessage = "You're offline. Try again when you have a connection."
            return .failed
        }
        OfflineStore.shared.enqueue(entityType: offlineEntity, operation: "update", entityId: id, body: body)
        notice = "Saved on this device. It syncs when you're back online."
        return .queued
    }
}

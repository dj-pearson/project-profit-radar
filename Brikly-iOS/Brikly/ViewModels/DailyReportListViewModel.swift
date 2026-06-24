import Foundation
import Observation

/// Offline-first daily report list.
///
/// Read flow:
///   1. Hydrate from `OfflineStore` immediately so the user sees something
///      even before the network is touched.
///   2. Fire a network refresh in the background; on success replace the
///      cache with the authoritative server list.
///
/// Write flow (create / update):
///   1. Try the network call first when online.
///   2. On network failure (or if offline), enqueue a `PendingMutation` and
///      apply an optimistic local row so the UI updates immediately. The
///      `SyncEngine` drains the queue on reconnect.
@Observable
@MainActor
final class DailyReportListViewModel {
    var reports: [DailyReport] = []
    var isLoading = false
    var errorMessage: String?

    private let service = DailyReportService()
    private let store = OfflineStore.shared

    func loadReports(projectId: String) async {
        // 1. Cache hydrate (synchronous, instant).
        let cached = store.cachedDailyReports(projectId: projectId)
        if !cached.isEmpty {
            reports = cached
        }

        // 2. Background refresh from the server.
        isLoading = reports.isEmpty   // Only show the spinner if we had nothing to display.
        errorMessage = nil

        do {
            let fresh = try await service.fetchReports(projectId: projectId)
            reports = fresh
            store.cacheDailyReports(fresh, projectId: projectId)
        } catch {
            // Network failed — keep showing the cached data and surface a
            // soft error only if the cache was empty too.
            if reports.isEmpty {
                errorMessage = DecodingErrorHelper.handle(error, context: "DailyReportList")
            }
        }
        isLoading = false
    }

    func createReport(_ report: NewDailyReport) async {
        if NetworkMonitor.shared.isOnline {
            do {
                let created = try await service.createReport(report)
                reports.insert(created, at: 0)
                store.upsertDailyReport(created)
                return
            } catch {
                // Fall through to the offline path so the user's input isn't lost.
                CrashReporter.breadcrumb("createReport network failure → enqueue", category: "sync")
            }
        }

        // Offline path: enqueue + show optimistic local row with a temporary id.
        store.enqueue(entityType: "daily_report", operation: "create", body: report)
        let temp = optimisticReport(from: report)
        reports.insert(temp, at: 0)
        store.upsertDailyReport(temp)
    }

    func updateReport(id: String, updates: DailyReportUpdate) async {
        if NetworkMonitor.shared.isOnline {
            do {
                let updated = try await service.updateReport(id: id, updates: updates)
                if let index = reports.firstIndex(where: { $0.id == id }) {
                    reports[index] = updated
                }
                store.upsertDailyReport(updated)
                return
            } catch {
                CrashReporter.breadcrumb("updateReport network failure → enqueue", category: "sync")
            }
        }

        // Offline path: enqueue + apply optimistic merge to the in-memory copy.
        store.enqueue(entityType: "daily_report", operation: "update", entityId: id, body: updates)
        if let index = reports.firstIndex(where: { $0.id == id }) {
            let merged = applyUpdates(updates, to: reports[index])
            reports[index] = merged
            store.upsertDailyReport(merged)
        }
    }

    /// Build a placeholder DailyReport from a NewDailyReport for offline display.
    /// The real id is assigned server-side; we use a `local-` prefix until the
    /// SyncEngine swaps it for the authoritative row.
    private func optimisticReport(from new: NewDailyReport) -> DailyReport {
        DailyReport(
            id: "local-\(UUID().uuidString)",
            projectId: new.projectId,
            companyId: new.companyId,
            siteId: new.siteId,
            date: new.date,
            crewCount: new.crewCount,
            weatherConditions: new.weatherConditions,
            temperature: new.temperature,
            weatherSource: nil,
            workPerformed: new.workPerformed,
            delaysIssues: new.delaysIssues,
            safetyIncidents: new.safetyIncidents,
            qualityIssues: nil,
            materialsDelivered: nil,
            equipmentUsed: nil,
            clientVisitors: nil,
            nextDayPlan: new.nextDayPlan,
            completionPercentage: nil,
            status: nil,
            photos: nil,
            gpsLatitude: nil,
            gpsLongitude: nil,
            gpsAccuracy: nil,
            isAutoPopulated: nil,
            templateId: nil,
            submittedBy: nil,
            submissionTimestamp: nil,
            createdBy: nil,
            createdAt: .now,
            updatedAt: nil
        )
    }

    private func applyUpdates(_ updates: DailyReportUpdate, to report: DailyReport) -> DailyReport {
        var copy = report
        if let v = updates.crewCount { copy.crewCount = v }
        if let v = updates.weatherConditions { copy.weatherConditions = v }
        if let v = updates.temperature { copy.temperature = v }
        if let v = updates.workPerformed { copy.workPerformed = v }
        if let v = updates.delaysIssues { copy.delaysIssues = v }
        if let v = updates.safetyIncidents { copy.safetyIncidents = v }
        if let v = updates.nextDayPlan { copy.nextDayPlan = v }
        return copy
    }
}

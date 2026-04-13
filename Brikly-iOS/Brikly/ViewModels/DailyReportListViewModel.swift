import Foundation
import Observation

@Observable
@MainActor
final class DailyReportListViewModel {
    var reports: [DailyReport] = []
    var isLoading = false
    var errorMessage: String?

    private let service = DailyReportService()

    func loadReports(projectId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            reports = try await service.fetchReports(projectId: projectId)
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "DailyReportList")
        }
        isLoading = false
    }

    func createReport(_ report: NewDailyReport) async {
        do {
            let created = try await service.createReport(report)
            reports.insert(created, at: 0)
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "CreateDailyReport")
        }
    }

    func updateReport(id: String, updates: DailyReportUpdate) async {
        do {
            let updated = try await service.updateReport(id: id, updates: updates)
            if let index = reports.firstIndex(where: { $0.id == id }) {
                reports[index] = updated
            }
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "UpdateDailyReport")
        }
    }
}

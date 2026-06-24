import Foundation
import Observation
import os
import Supabase
import Realtime

@Observable
@MainActor
final class JobCostListViewModel {
    var jobCosts: [JobCost] = []
    var costCodes: [CostCode] = []
    var isLoading = false
    var errorMessage: String?

    private let service = JobCostService()
    private var realtimeChannel: RealtimeChannelV2?
    private var projectId: String?

    // MARK: - Computed

    var totalLabor: Double { jobCosts.reduce(0) { $0 + ($1.laborCost ?? 0) } }
    var totalMaterial: Double { jobCosts.reduce(0) { $0 + ($1.materialCost ?? 0) } }
    var totalEquipment: Double { jobCosts.reduce(0) { $0 + ($1.equipmentCost ?? 0) } }
    var totalOther: Double { jobCosts.reduce(0) { $0 + ($1.otherCost ?? 0) } }
    var grandTotal: Double { jobCosts.reduce(0) { $0 + $1.effectiveTotal } }

    func costCode(for id: String) -> CostCode? {
        costCodes.first { $0.id == id }
    }

    // MARK: - Data loading

    func loadData(projectId: String, companyId: String) async {
        self.projectId = projectId
        isLoading = true
        errorMessage = nil
        do {
            async let costs = service.fetchJobCosts(projectId: projectId)
            async let codes = service.fetchCostCodes(companyId: companyId)
            jobCosts = try await costs
            costCodes = try await codes
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "JobCostList")
        }
        isLoading = false
    }

    func createJobCost(_ cost: NewJobCost) async {
        do {
            let created = try await service.createJobCost(cost)
            jobCosts.insert(created, at: 0)
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "CreateJobCost")
        }
    }

    // MARK: - Realtime

    func subscribeToRealtime(projectId: String) async {
        self.projectId = projectId
        let channel = await service.realtimeChannel(projectId: projectId)
        self.realtimeChannel = channel

        let changes = await channel.postgresChange(
            AnyAction.self,
            schema: "public",
            table: "job_costs",
            filter: "project_id=eq.\(projectId)"
        )

        await channel.subscribe()

        // Listen for changes and reload
        for await _ in changes {
            await self.reload()
        }
    }

    func unsubscribeFromRealtime() async {
        if let channel = realtimeChannel {
            await channel.unsubscribe()
            realtimeChannel = nil
        }
    }

    private func reload() async {
        guard let pid = projectId else { return }
        do {
            jobCosts = try await service.fetchJobCosts(projectId: pid)
        } catch {
            Loggers.viewModels.error("[JobCostListVM] Realtime reload error: \(error.localizedDescription, privacy: .public)")
        }
    }
}

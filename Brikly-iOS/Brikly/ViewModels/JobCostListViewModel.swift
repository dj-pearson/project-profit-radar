import Foundation
import Observation
import os
import Supabase
import Realtime

/// Offline-first job cost list. Job costs are append-only by domain, so only
/// the create path is queued — conflicts are minimal. Cost codes are read-only
/// reference data, cached on first online fetch and never enqueued.
///
/// Realtime: the subscription is only attempted when the device is online and
/// gracefully no-ops otherwise.
@Observable
@MainActor
final class JobCostListViewModel {
    var jobCosts: [JobCost] = []
    var costCodes: [CostCode] = []
    var isLoading = false
    var errorMessage: String?

    private let service = JobCostService()
    private let store = OfflineStore.shared
    private var realtimeChannel: RealtimeChannelV2?
    private var projectId: String?
    private var companyId: String?

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
        self.companyId = companyId

        // 1. Cache hydrate (synchronous, instant) for both costs and reference codes.
        let cachedCosts = store.cachedJobCosts(projectId: projectId)
        if !cachedCosts.isEmpty {
            jobCosts = cachedCosts
        }
        let cachedCodes = store.cachedCostCodes(companyId: companyId)
        if !cachedCodes.isEmpty {
            costCodes = cachedCodes
        }

        // 2. Background refresh from the server.
        isLoading = jobCosts.isEmpty
        errorMessage = nil
        do {
            async let costs = service.fetchJobCosts(projectId: projectId)
            async let codes = service.fetchCostCodes(companyId: companyId)
            let freshCosts = try await costs
            let freshCodes = try await codes
            jobCosts = freshCosts
            costCodes = freshCodes
            store.cacheJobCosts(freshCosts, projectId: projectId)
            store.cacheCostCodes(freshCodes, companyId: companyId)
        } catch {
            // Keep cached data on screen; only surface an error if we had nothing.
            if jobCosts.isEmpty {
                errorMessage = DecodingErrorHelper.handle(error, context: "JobCostList")
            }
        }
        isLoading = false
    }

    func createJobCost(_ cost: NewJobCost) async {
        if NetworkMonitor.shared.isOnline {
            do {
                let created = try await service.createJobCost(cost)
                jobCosts.insert(created, at: 0)
                store.upsertJobCost(created)
                return
            } catch {
                CrashReporter.breadcrumb("createJobCost network failure → enqueue", category: "sync")
            }
        }

        // Offline path: enqueue (create-only) + optimistic local insert.
        store.enqueue(entityType: "job_cost", operation: "create", body: cost)
        let temp = optimisticJobCost(from: cost)
        jobCosts.insert(temp, at: 0)
        store.upsertJobCost(temp)
    }

    // MARK: - Realtime

    func subscribeToRealtime(projectId: String) async {
        self.projectId = projectId

        // Only attempt the realtime subscription when online; gracefully no-op
        // otherwise so offline launches don't spin on a dead socket.
        guard NetworkMonitor.shared.isOnline else { return }

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
            let fresh = try await service.fetchJobCosts(projectId: pid)
            jobCosts = fresh
            store.cacheJobCosts(fresh, projectId: pid)
        } catch {
            Loggers.viewModels.error("[JobCostListVM] Realtime reload error: \(error.localizedDescription, privacy: .public)")
        }
    }

    // MARK: - Optimistic helpers

    /// Build a placeholder `JobCost` from a `NewJobCost` for offline display.
    /// The real id is assigned server-side; we use a `local-` prefix until the
    /// SyncEngine swaps it for the authoritative row on the next refresh.
    private func optimisticJobCost(from new: NewJobCost) -> JobCost {
        JobCost(
            id: "local-\(UUID().uuidString)",
            projectId: new.projectId,
            costCodeId: new.costCodeId,
            date: new.date,
            description: new.description,
            laborCost: new.laborCost,
            laborHours: new.laborHours,
            materialCost: new.materialCost,
            equipmentCost: new.equipmentCost,
            otherCost: new.otherCost,
            totalCost: nil,
            createdBy: nil,
            createdAt: .now,
            updatedAt: nil
        )
    }
}

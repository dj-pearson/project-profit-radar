import Foundation
import Observation

/// Clock in / break / clock out against `time_entries`, following the web
/// mobile clock (`MobileTimeClock.tsx`): a project and cost code are
/// required, a GPS fix is required, and clocking in outside the project's
/// geofence is refused. Break time is excluded from `total_hours`.
///
/// Offline: a clock-in made without a connection is held on the device
/// (not queued) and written as one complete row at clock-out, so the queue
/// never has to map a temporary id onto a later update. A clock-out for an
/// entry that already exists on the server is queued as an update.
@Observable
@MainActor
final class TimeClockViewModel {
    /// The current shift, whether it lives on the server or only on the device.
    struct Shift: Equatable {
        var serverId: String?
        var projectId: String
        var costCodeId: String?
        var start: Date
        var breakMinutes: Double
    }

    var projects: [Project] = []
    var costCodes: [CostCode] = []
    var selectedProjectId = "" {
        didSet { if oldValue != selectedProjectId { selectedCostCodeId = "" } }
    }
    var selectedCostCodeId = ""
    var shift: Shift?
    var breakStartedAt: Date?
    var recentEntries: [TimeEntry] = []
    var isLoading = false
    var isWorking = false
    var errorMessage: String?
    var notice: String?

    private let service = TimeEntryService()
    private let projectService = ProjectService()
    private let store = OfflineStore.shared
    private let defaults = UserDefaults.standard

    // UserDefaults keys. Treat as a contract: renaming one strands a shift
    // that is in progress on a device during the upgrade.
    private static let pendingClockInKey = "brikly.timeClock.pendingClockIn"
    private static let breakStartedKey = "brikly.timeClock.breakStartedAt"

    var isClockedIn: Bool { shift != nil }
    var isOnBreak: Bool { breakStartedAt != nil }
    var isShiftLocalOnly: Bool { shift != nil && shift?.serverId == nil }

    var selectedProject: Project? { projects.first { $0.id == selectedProjectId } }

    func project(for id: String) -> Project? { projects.first { $0.id == id } }
    func costCode(for id: String?) -> CostCode? {
        guard let id else { return nil }
        return costCodes.first { $0.id == id }
    }

    /// Hours worked since the start of the current week (Sunday/Monday per
    /// the user's locale), including the open shift.
    func weekHours(now: Date = .now) -> Double {
        let weekStart = Calendar.current.dateInterval(of: .weekOfYear, for: now)?.start ?? now
        let closed = recentEntries
            .filter { !$0.isOpen && $0.startTime >= weekStart }
            .reduce(0) { $0 + $1.workedHours(now: now) }
        return closed + currentShiftHours(now: now)
    }

    func currentShiftHours(now: Date = .now) -> Double {
        guard let shift else { return 0 }
        let runningBreak = breakStartedAt.map { now.timeIntervalSince($0) / 60 } ?? 0
        return max(0, now.timeIntervalSince(shift.start) / 3600 - (shift.breakMinutes + runningBreak) / 60)
    }

    // MARK: - Load

    func load(userId: String, companyId: String) async {
        isLoading = projects.isEmpty
        errorMessage = nil
        defer { isLoading = false }

        breakStartedAt = defaults.object(forKey: Self.breakStartedKey) as? Date

        let cached = store.cachedProjects(companyId: companyId)
        if !cached.isEmpty { projects = Self.clockable(cached) }

        do {
            let fresh = try await projectService.fetchProjects(companyId: companyId)
            projects = Self.clockable(fresh)
        } catch {
            if projects.isEmpty {
                errorMessage = DecodingErrorHelper.handle(error, context: "TimeClock.projects")
            }
        }

        if let pending = pendingClockIn() {
            shift = Shift(
                serverId: nil,
                projectId: pending.projectId,
                costCodeId: pending.costCodeId,
                start: ISO8601DateFormatter().date(from: pending.startTime) ?? .now,
                breakMinutes: pending.breakDuration
            )
        } else {
            do {
                let row = try await service.fetchOpenEntry(userId: userId)
                if let row {
                    shift = Shift(
                        serverId: row.id,
                        projectId: row.projectId,
                        costCodeId: row.costCodeId,
                        start: row.startTime,
                        breakMinutes: row.breakDuration ?? 0
                    )
                } else {
                    shift = nil
                    clearBreak()
                }
            } catch {
                // Offline: keep whatever shift state we already had.
            }
        }

        if let shift { selectedProjectId = shift.projectId }
        if selectedProjectId.isEmpty, projects.count == 1 { selectedProjectId = projects[0].id }
        await loadCostCodes(companyId: companyId)
        if let costCodeId = shift?.costCodeId { selectedCostCodeId = costCodeId }
        await loadRecent(userId: userId)
    }

    func loadCostCodes(companyId: String) async {
        guard !selectedProjectId.isEmpty else {
            costCodes = []
            return
        }
        do {
            costCodes = try await service.costCodes(projectId: selectedProjectId, companyId: companyId)
            store.cacheCostCodes(costCodes, companyId: companyId)
        } catch {
            // Offline: the cached company list, unordered by budget.
            costCodes = store.cachedCostCodes(companyId: companyId)
        }
    }

    func loadRecent(userId: String) async {
        // Two weeks covers "this week" plus last week's timesheet.
        let since = Calendar.current.date(byAdding: .day, value: -14, to: .now) ?? .now
        let entries = try? await service.fetchEntries(userId: userId, since: since)
        if let entries { recentEntries = entries }
    }

    // MARK: - Clock in

    func clockIn(userId: String) async {
        guard let project = selectedProject else {
            errorMessage = "Pick a project first."
            return
        }
        guard !selectedCostCodeId.isEmpty else {
            // An entry with no cost code posts no labor cost when approved.
            errorMessage = "Pick a cost code. Hours without one can't be charged to the job."
            return
        }

        isWorking = true
        errorMessage = nil
        notice = nil
        defer { isWorking = false }

        guard let location = await LocationService.shared.currentLocation() else {
            errorMessage = LocationService.shared.isDenied
                ? "Location is off for Brikly. Turn it on in Settings to clock in."
                : "Couldn't get your location. Step outside or try again."
            return
        }

        let distance = project.distance(from: location)
        let inside = distance.map { $0 <= project.effectiveGeofenceRadius }
        if inside == false {
            errorMessage = "You're \(Int(distance ?? 0)) m from the job site. Clock in within \(Int(project.effectiveGeofenceRadius)) m."
            return
        }

        let now = Date()
        let entry = NewTimeEntry(
            userId: userId,
            projectId: project.id,
            costCodeId: selectedCostCodeId,
            siteId: project.siteId,
            startTime: ISO8601DateFormatter().string(from: now),
            endTime: nil,
            totalHours: nil,
            breakDuration: 0,
            description: nil,
            gpsLatitude: location.coordinate.latitude,
            gpsLongitude: location.coordinate.longitude,
            locationAccuracy: location.horizontalAccuracy,
            isGeofenceVerified: inside == true,
            geofenceDistanceMeters: distance,
            geofenceBreachDetected: false
        )

        if NetworkMonitor.shared.isOnline {
            do {
                let created = try await service.create(entry)
                shift = Shift(serverId: created.id, projectId: created.projectId,
                              costCodeId: created.costCodeId, start: created.startTime, breakMinutes: 0)
                return
            } catch {
                CrashReporter.breadcrumb("clockIn network failure -> hold on device", category: "sync")
            }
        }

        savePendingClockIn(entry)
        shift = Shift(serverId: nil, projectId: project.id, costCodeId: selectedCostCodeId, start: now, breakMinutes: 0)
        notice = "Clocked in on this device. It syncs when you clock out with a connection."
    }

    // MARK: - Breaks

    func toggleBreak() async {
        guard var current = shift else { return }
        if let started = breakStartedAt {
            let minutes = (Date().timeIntervalSince(started) / 60).rounded()
            current.breakMinutes += minutes
            shift = current
            clearBreak()
            await persistBreak(current)
        } else {
            breakStartedAt = .now
            defaults.set(breakStartedAt, forKey: Self.breakStartedKey)
        }
    }

    private func persistBreak(_ current: Shift) async {
        guard let id = current.serverId else {
            if var pending = pendingClockIn() {
                pending.breakDuration = current.breakMinutes
                savePendingClockIn(pending)
            }
            return
        }
        let update = TimeEntryUpdate(endTime: nil, totalHours: nil, breakDuration: current.breakMinutes)
        if NetworkMonitor.shared.isOnline, (try? await service.update(id: id, update)) != nil { return }
        store.enqueue(entityType: "time_entry", operation: "update", entityId: id, body: update)
    }

    // MARK: - Clock out

    func clockOut(userId: String) async {
        guard var current = shift else { return }
        isWorking = true
        errorMessage = nil
        notice = nil
        defer { isWorking = false }

        if let started = breakStartedAt {
            current.breakMinutes += (Date().timeIntervalSince(started) / 60).rounded()
            clearBreak()
        }

        let end = Date()
        let hours = max(0, end.timeIntervalSince(current.start) / 3600 - current.breakMinutes / 60)
        let endString = ISO8601DateFormatter().string(from: end)
        let rounded = (hours * 100).rounded() / 100

        if let id = current.serverId {
            let update = TimeEntryUpdate(endTime: endString, totalHours: rounded, breakDuration: current.breakMinutes)
            var saved = false
            if NetworkMonitor.shared.isOnline {
                saved = (try? await service.update(id: id, update)) != nil
            }
            if !saved {
                store.enqueue(entityType: "time_entry", operation: "update", entityId: id, body: update)
                notice = "Clocked out. It syncs when you're back online."
            }
        } else if var pending = pendingClockIn() {
            pending.endTime = endString
            pending.totalHours = rounded
            pending.breakDuration = current.breakMinutes
            var saved = false
            if NetworkMonitor.shared.isOnline {
                saved = (try? await service.create(pending)) != nil
            }
            if !saved {
                store.enqueue(entityType: "time_entry", operation: "create", body: pending)
                notice = "Clocked out. It syncs when you're back online."
            }
            clearPendingClockIn()
        }

        shift = nil
        await loadRecent(userId: userId)
    }

    // MARK: - Device-held state

    private func pendingClockIn() -> NewTimeEntry? {
        guard let data = defaults.data(forKey: Self.pendingClockInKey) else { return nil }
        return try? JSONDecoder().decode(NewTimeEntry.self, from: data)
    }

    private func savePendingClockIn(_ entry: NewTimeEntry) {
        if let data = try? JSONEncoder().encode(entry) {
            defaults.set(data, forKey: Self.pendingClockInKey)
        }
    }

    private func clearPendingClockIn() {
        defaults.removeObject(forKey: Self.pendingClockInKey)
    }

    private func clearBreak() {
        breakStartedAt = nil
        defaults.removeObject(forKey: Self.breakStartedKey)
    }

    /// Projects a crew member can clock into. Web lists `active` only; iOS
    /// also accepts `in_progress`, which the web project list treats as live.
    private static func clockable(_ projects: [Project]) -> [Project] {
        projects
            .filter { $0.status == "active" || $0.status == "in_progress" }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }
}

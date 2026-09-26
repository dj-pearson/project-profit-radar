import Foundation
import Observation

/// Today's crew assignments for the signed-in user, with GPS check-in and
/// check-out. Mirrors `useCrewGPSCheckin.ts`. Needs a connection: the
/// server-side distance check is the point of it.
@Observable
@MainActor
final class CrewCheckInViewModel {
    var assignments: [CrewAssignment] = []
    var isLoading = false
    var workingId: String?
    var errorMessage: String?
    var message: String?

    private let service = CrewService()

    func load(userId: String) async {
        isLoading = assignments.isEmpty
        defer { isLoading = false }
        do {
            assignments = try await service.myAssignments(userId: userId, date: DateFormatting.localISODate(.now))
        } catch {
            // No assignments section is shown when this fails; the clock
            // still works without it.
            Loggers.viewModels.error("Crew assignments failed: \(error.localizedDescription, privacy: .public)")
        }
    }

    /// Returns the project id when the check-in was verified on site, so the
    /// caller can line the time clock up with it.
    @discardableResult
    func checkIn(_ assignment: CrewAssignment, userId: String) async -> String? {
        workingId = assignment.id
        errorMessage = nil
        message = nil
        defer { workingId = nil }

        guard NetworkMonitor.shared.isOnline else {
            errorMessage = "Check-in needs a connection so the site location can be verified."
            return nil
        }
        guard let location = await LocationService.shared.currentLocation() else {
            errorMessage = LocationService.shared.isDenied
                ? "Location is off for Brikly. Turn it on in Settings to check in."
                : "Couldn't get your location. Try again."
            return nil
        }
        do {
            let result = try await service.checkIn(
                assignmentId: assignment.id,
                latitude: location.coordinate.latitude,
                longitude: location.coordinate.longitude,
                accuracy: location.horizontalAccuracy
            )
            await load(userId: userId)
            guard result.success else {
                errorMessage = result.error ?? "Check-in failed."
                return nil
            }
            if result.verified == true {
                message = result.message ?? "Checked in on site."
                return assignment.projectId
            }
            errorMessage = result.message ?? "You're not within the site radius yet."
            return nil
        } catch {
            errorMessage = "Check-in failed: \(error.localizedDescription)"
            return nil
        }
    }

    func checkOut(_ assignment: CrewAssignment, userId: String) async {
        workingId = assignment.id
        errorMessage = nil
        message = nil
        defer { workingId = nil }

        // Location is recorded when available but doesn't block leaving.
        let location = await LocationService.shared.currentLocation()
        do {
            try await service.checkOut(
                assignmentId: assignment.id,
                latitude: location?.coordinate.latitude,
                longitude: location?.coordinate.longitude
            )
            message = "Checked out."
            await load(userId: userId)
        } catch {
            errorMessage = "Check-out failed: \(error.localizedDescription)"
        }
    }
}

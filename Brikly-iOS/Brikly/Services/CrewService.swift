import Foundation
import Supabase

actor CrewService {
    private let client = SupabaseService.shared.client

    /// The user's assignments for one day (`yyyy-MM-dd`, device time zone).
    func myAssignments(userId: String, date: String) async throws -> [CrewAssignment] {
        try await client
            .from("crew_assignments")
            .select()
            .eq("crew_member_id", value: userId)
            .eq("assigned_date", value: date)
            .order("start_time", ascending: true)
            .execute()
            .value
    }

    /// GPS check-in. The server measures the distance and decides; the app
    /// only reports where the phone is.
    func checkIn(assignmentId: String, latitude: Double, longitude: Double, accuracy: Double) async throws -> CrewCheckInResult {
        try await client
            .rpc("verify_crew_gps_checkin", params: CrewCheckInParams(
                pAssignmentId: assignmentId,
                pLatitude: latitude,
                pLongitude: longitude,
                pAccuracy: accuracy
            ))
            .execute()
            .value
    }

    func checkOut(assignmentId: String, latitude: Double?, longitude: Double?) async throws {
        let update = CrewCheckOutUpdate(
            gpsCheckoutTimestamp: ISO8601DateFormatter().string(from: .now),
            gpsCheckoutLat: latitude,
            gpsCheckoutLng: longitude
        )
        try await client
            .from("crew_assignments")
            .update(update)
            .eq("id", value: assignmentId)
            .execute()
    }

    /// Crew presence for a project on one day, on-site first.
    func presence(projectId: String, date: String) async throws -> [CrewPresence] {
        try await client
            .from("crew_presence_dashboard")
            .select()
            .eq("project_id", value: projectId)
            .eq("assigned_date", value: date)
            .execute()
            .value
    }
}

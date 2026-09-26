import Foundation

/// A row in `crew_assignments`: one crew member scheduled on one project for
/// one day. Check-in is recorded by `verify_crew_gps_checkin`, which also
/// sets `is_onsite` and moves `status` to `in_progress`.
struct CrewAssignment: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let crewMemberId: String
    let projectId: String
    var assignedDate: String         // PostgreSQL `date`
    var startTime: String?
    var endTime: String?
    var status: String
    var location: String?
    var notes: String?
    var isOnsite: Bool?
    var gpsCheckinVerified: Bool?
    var gpsCheckinTimestamp: Date?
    var gpsCheckoutTimestamp: Date?
    var distanceFromSite: Double?

    var isCheckedIn: Bool { isOnsite == true && gpsCheckoutTimestamp == nil }
    var isDone: Bool { status == "completed" || gpsCheckoutTimestamp != nil }
}

/// What `verify_crew_gps_checkin` returns.
struct CrewCheckInResult: Decodable, Sendable {
    let success: Bool
    let verified: Bool?
    let distanceMeters: Double?
    let allowedRadiusMeters: Double?
    let message: String?
    let error: String?
}

struct CrewCheckInParams: Encodable, Sendable {
    let pAssignmentId: String
    let pLatitude: Double
    let pLongitude: Double
    let pAccuracy: Double

    enum CodingKeys: String, CodingKey {
        case pAssignmentId = "p_assignment_id"
        case pLatitude = "p_latitude"
        case pLongitude = "p_longitude"
        case pAccuracy = "p_accuracy"
    }
}

/// Check-out payload, the same update `useCrewGPSCheckin.ts` makes.
struct CrewCheckOutUpdate: Encodable, Sendable {
    let gpsCheckoutTimestamp: String
    let gpsCheckoutLat: Double?
    let gpsCheckoutLng: Double?
    let isOnsite = false
    let status = "completed"

    enum CodingKeys: String, CodingKey {
        case gpsCheckoutTimestamp = "gps_checkout_timestamp"
        case gpsCheckoutLat = "gps_checkout_lat"
        case gpsCheckoutLng = "gps_checkout_lng"
        case isOnsite = "is_onsite"
        case status
    }
}

/// A row in the `crew_presence_dashboard` view, for "who's on site".
struct CrewPresence: Codable, Identifiable, Hashable, Sendable {
    let assignmentId: String
    let projectId: String
    var assignedDate: String
    var crewMemberName: String?
    var crewMemberRole: String?
    var crewMemberPhone: String?
    var isOnsite: Bool?
    var gpsCheckinTimestamp: Date?
    var gpsCheckoutTimestamp: Date?
    var hoursOnsite: Double?
    var presenceStatus: String?

    var id: String { assignmentId }
}

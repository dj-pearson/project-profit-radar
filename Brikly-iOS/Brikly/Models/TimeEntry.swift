import Foundation

/// A row in `time_entries`. Rates and labor cost are resolved server-side at
/// approval (see Brikly-iOS/AGENTS.md, US-321), so the model deliberately has
/// no cost fields: the device never computes pay.
struct TimeEntry: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let userId: String
    let projectId: String
    var costCodeId: String?
    var taskId: String?
    var startTime: Date
    var endTime: Date?
    var totalHours: Double?
    var breakDuration: Double?   // minutes
    var description: String?
    var approvalStatus: String?
    var isGeofenceVerified: Bool?
    var geofenceDistanceMeters: Double?
    var createdAt: Date?

    var isOpen: Bool { endTime == nil }

    /// Worked hours: the stored total when closed, otherwise wall-clock time
    /// since start minus recorded breaks.
    func workedHours(now: Date = .now) -> Double {
        if let totalHours, endTime != nil { return totalHours }
        let end = endTime ?? now
        let breaks = (breakDuration ?? 0) / 60
        return max(0, end.timeIntervalSince(startTime) / 3600 - breaks)
    }
}

// MARK: - Insert/Update DTOs

/// Clock-in payload. `company_id` is filled by `trg_time_entry_company_id`
/// and rates by `resolve_labor_rate()` at approval, so neither is sent.
struct NewTimeEntry: Codable, Sendable {
    let userId: String
    let projectId: String
    var costCodeId: String
    var siteId: String?
    var startTime: String            // ISO 8601
    var endTime: String?
    var totalHours: Double?
    var breakDuration: Double
    var description: String?
    var gpsLatitude: Double?
    var gpsLongitude: Double?
    var locationAccuracy: Double?
    var isGeofenceVerified: Bool?
    var geofenceDistanceMeters: Double?
    var geofenceBreachDetected: Bool?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case projectId = "project_id"
        case costCodeId = "cost_code_id"
        case siteId = "site_id"
        case startTime = "start_time"
        case endTime = "end_time"
        case totalHours = "total_hours"
        case breakDuration = "break_duration"
        case description
        case gpsLatitude = "gps_latitude"
        case gpsLongitude = "gps_longitude"
        case locationAccuracy = "location_accuracy"
        case isGeofenceVerified = "is_geofence_verified"
        case geofenceDistanceMeters = "geofence_distance_meters"
        case geofenceBreachDetected = "geofence_breach_detected"
    }
}

struct TimeEntryUpdate: Codable, Sendable {
    var endTime: String?
    var totalHours: Double?
    var breakDuration: Double?

    enum CodingKeys: String, CodingKey {
        case endTime = "end_time"
        case totalHours = "total_hours"
        case breakDuration = "break_duration"
    }
}

/// A project's budget line, used to put the job's own cost codes first in
/// the clock-in picker (same ordering as the web clock).
struct ProjectBudgetLine: Codable, Sendable {
    let costCodeId: String
}

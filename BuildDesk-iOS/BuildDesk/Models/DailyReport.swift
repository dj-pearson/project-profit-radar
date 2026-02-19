import Foundation

struct DailyReport: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let projectId: String
    var companyId: String?
    var siteId: String
    var date: String          // Keep as String — PostgreSQL `date` type ("2024-01-15")
    var crewCount: Int?
    var weatherConditions: String?
    var temperature: Double?
    var weatherSource: String?
    var workPerformed: String?
    var delaysIssues: String?
    var safetyIncidents: String?
    var qualityIssues: String?
    var materialsDelivered: String?
    var equipmentUsed: String?
    var clientVisitors: String?
    var nextDayPlan: String?
    var completionPercentage: Double?
    var status: String?
    var photos: [String]?
    var gpsLatitude: Double?
    var gpsLongitude: Double?
    var gpsAccuracy: Double?
    var isAutoPopulated: Bool?
    var templateId: String?
    var submittedBy: String?
    var submissionTimestamp: Date?
    var createdBy: String?
    let createdAt: Date
    var updatedAt: Date

    /// Parse the date string for display.
    var reportDate: Date? {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        return f.date(from: date)
    }
}

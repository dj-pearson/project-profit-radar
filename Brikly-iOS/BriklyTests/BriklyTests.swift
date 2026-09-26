import XCTest
@testable import Brikly

final class BriklyTests: XCTestCase {
    // MARK: - Formatters

    func testCurrencyFormatterFull() {
        XCTAssertEqual(CurrencyFormatter.format(1234.56), "$1,234.56")
        XCTAssertEqual(CurrencyFormatter.format(0), "$0")
    }

    func testCurrencyFormatterCompact() {
        XCTAssertEqual(CurrencyFormatter.compact(500), "$500")
        XCTAssertEqual(CurrencyFormatter.compact(1500), "$1.5K")
        XCTAssertEqual(CurrencyFormatter.compact(2_500_000), "$2.5M")
    }

    // MARK: - Status enums

    func testProjectStatusMapping() {
        XCTAssertEqual(ProjectStatus(rawValue: "active"), .active)
        XCTAssertEqual(ProjectStatus(rawValue: "on_hold"), .onHold)
        XCTAssertNil(ProjectStatus(rawValue: "some_new_status"))
    }

    func testTaskStatusMapping() {
        XCTAssertEqual(TaskStatus(rawValue: "in_progress"), .inProgress)
        XCTAssertEqual(TaskStatus(rawValue: "pending"), .pending)
    }

    func testProjectDisplayStatusFallsBackToUnknown() {
        let json = """
        {
          "id": "p1",
          "company_id": "c1",
          "name": "X",
          "status": "completely-new-status",
          "created_at": "2024-01-01T00:00:00+00:00"
        }
        """
        let project = try! decode(Project.self, from: json)
        XCTAssertEqual(project.displayStatus, .unknown)
    }

    // MARK: - DateFormatting

    func testDateFormattingIsoDate() {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)

        let date = formatter.date(from: "2024-06-15")!
        XCTAssertEqual(DateFormatting.isoDate(date), "2024-06-15")
    }

    // MARK: - PostgresDateDecoding

    func testPostgresDateDecodingHandlesPlainISO() throws {
        // 2024-01-15T10:30:00+00:00 — no fractional seconds
        let date = try decodeDate(from: "\"2024-01-15T10:30:00+00:00\"")
        XCTAssertNotNil(date)
    }

    func testPostgresDateDecodingHandlesMicroseconds() throws {
        // 6-digit fractional seconds — typical PostgreSQL `timestamptz` format
        let date = try decodeDate(from: "\"2024-01-15T10:30:00.123456+00:00\"")
        XCTAssertNotNil(date)
    }

    func testPostgresDateDecodingHandlesMilliseconds() throws {
        let date = try decodeDate(from: "\"2024-01-15T10:30:00.123+00:00\"")
        XCTAssertNotNil(date)
    }

    // MARK: - Model decoding

    func testUserProfileDecodingMinimal() throws {
        // Validates that nullable / optional columns don't blow up decoding —
        // representative of a fresh row right after the auth signup trigger fires.
        let json = """
        {
          "id": "00000000-0000-0000-0000-000000000001",
          "email": "test@brikly.net",
          "first_name": null,
          "last_name": null,
          "company_id": null,
          "role": "admin",
          "is_active": true,
          "tenant_id": null,
          "last_login": null,
          "created_at": "2024-01-15T10:30:00+00:00",
          "updated_at": null
        }
        """
        let profile = try decode(UserProfile.self, from: json)
        XCTAssertEqual(profile.email, "test@brikly.net")
        XCTAssertEqual(profile.role, "admin")
        XCTAssertNil(profile.firstName)
        XCTAssertNil(profile.companyId)
    }

    func testUserProfileDisplayNameFallsBackToEmail() {
        let profile = UserProfile(
            id: "u1",
            email: "fallback@brikly.net",
            firstName: nil,
            lastName: nil,
            companyId: nil,
            role: "admin",
            siteId: nil,
            phone: nil,
            avatarUrl: nil,
            isActive: true,
            tenantId: nil,
            lastLogin: nil,
            createdAt: Date(),
            updatedAt: nil
        )
        XCTAssertEqual(profile.displayName, "fallback@brikly.net")
    }

    func testProjectDecodingWithNullOptionals() throws {
        let json = """
        {
          "id": "p1",
          "company_id": "c1",
          "name": "Riverside Renovation",
          "status": "active",
          "description": null,
          "budget": 50000,
          "total_budget": null,
          "client_name": "Acme Corp",
          "site_id": null,
          "created_at": "2024-03-01T08:00:00.000000+00:00",
          "updated_at": null
        }
        """
        let project = try decode(Project.self, from: json)
        XCTAssertEqual(project.name, "Riverside Renovation")
        XCTAssertEqual(project.displayStatus, .active)
        XCTAssertEqual(project.effectiveBudget, 50_000)
        XCTAssertEqual(project.clientName, "Acme Corp")
        XCTAssertNil(project.totalBudget)
    }

    func testProjectEffectiveBudgetPrefersTotalOverEstimate() throws {
        let json = """
        {
          "id": "p1",
          "company_id": "c1",
          "name": "X",
          "budget": 10000,
          "total_budget": 25000,
          "created_at": "2024-01-01T00:00:00+00:00"
        }
        """
        let project = try decode(Project.self, from: json)
        XCTAssertEqual(project.effectiveBudget, 25_000)
    }

    // MARK: - Time clock

    func testTimeEntryWorkedHoursExcludesBreaks() throws {
        let json = """
        {
          "id": "t1",
          "user_id": "u1",
          "project_id": "p1",
          "start_time": "2024-01-15T08:00:00+00:00",
          "break_duration": 30,
          "created_at": "2024-01-15T08:00:00+00:00"
        }
        """
        let entry = try decode(TimeEntry.self, from: json)
        XCTAssertTrue(entry.isOpen)
        let fourHoursLater = entry.startTime.addingTimeInterval(4 * 3600)
        XCTAssertEqual(entry.workedHours(now: fourHoursLater), 3.5, accuracy: 0.0001)
    }

    func testClosedTimeEntryUsesStoredTotal() throws {
        let json = """
        {
          "id": "t1",
          "user_id": "u1",
          "project_id": "p1",
          "start_time": "2024-01-15T08:00:00+00:00",
          "end_time": "2024-01-15T16:00:00+00:00",
          "total_hours": 7.5
        }
        """
        let entry = try decode(TimeEntry.self, from: json)
        XCTAssertFalse(entry.isOpen)
        XCTAssertEqual(entry.workedHours(), 7.5)
    }

    /// Rates and company_id are server-owned (AGENTS.md, US-321); the clock-in
    /// payload must never carry them.
    func testNewTimeEntryPayloadHasNoServerOwnedFields() throws {
        let entry = NewTimeEntry(
            userId: "u1", projectId: "p1", costCodeId: "cc1", siteId: nil,
            startTime: "2024-01-15T08:00:00Z", endTime: nil, totalHours: nil,
            breakDuration: 0, description: nil, gpsLatitude: 1, gpsLongitude: 2,
            locationAccuracy: 5, isGeofenceVerified: true, geofenceDistanceMeters: 12,
            geofenceBreachDetected: false
        )
        let object = try XCTUnwrap(
            JSONSerialization.jsonObject(with: JSONEncoder().encode(entry)) as? [String: Any]
        )
        XCTAssertEqual(object["cost_code_id"] as? String, "cc1")
        XCTAssertEqual(object["is_geofence_verified"] as? Bool, true)
        for key in ["company_id", "hourly_rate", "burden_rate", "labor_cost", "site_id", "end_time"] {
            XCTAssertNil(object[key], "\(key) should not be sent")
        }
    }

    // MARK: - Project records

    func testRecordNumberMatchesWebFormat() {
        let number = RecordNumber.make("RFI")
        XCTAssertTrue(number.hasPrefix("RFI-"))
        XCTAssertEqual(number.count, 12)
        XCTAssertTrue(number.dropFirst(4).allSatisfy(\.isNumber))
    }

    func testDisplayDateDoesNotShiftAcrossTimeZones() {
        let original = NSTimeZone.default
        defer { NSTimeZone.default = original }
        NSTimeZone.default = TimeZone(identifier: "America/Los_Angeles")!
        XCTAssertTrue(DateFormatting.displayDate("2024-01-15").contains("15"))
        XCTAssertEqual(DateFormatting.displayDate(nil), "\u{2014}")
    }

    func testChangeOrderDecodesFromEdgeEnvelopeAndSummarizesApproval() throws {
        let json = """
        {
          "id": "co1",
          "change_order_number": "CO-003",
          "title": "Add outlet",
          "amount": 450.5,
          "status": "pending",
          "internal_approved": true,
          "client_approved": null,
          "project_id": "p1",
          "projects": { "name": "X", "client_name": "Y" }
        }
        """
        let order = try decode(ChangeOrder.self, from: json)
        XCTAssertEqual(order.changeOrderNumber, "CO-003")
        XCTAssertEqual(order.amount, 450.5)
        XCTAssertEqual(order.approvalSummary, "Awaiting client")
    }

    func testChangeOrderPermissionsMatchEdgeFunction() {
        XCTAssertTrue(ChangeOrderPermissions.canManage(role: "project_manager"))
        XCTAssertFalse(ChangeOrderPermissions.canManage(role: "field_supervisor"))
    }

    // MARK: - Helpers

    private func decode<T: Decodable>(_ type: T.Type, from jsonString: String) throws -> T {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = PostgresDateDecoding.strategy
        return try decoder.decode(T.self, from: Data(jsonString.utf8))
    }

    private func decodeDate(from jsonString: String) throws -> Date {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = PostgresDateDecoding.strategy
        return try decoder.decode(Date.self, from: Data(jsonString.utf8))
    }
}

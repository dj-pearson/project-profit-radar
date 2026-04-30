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

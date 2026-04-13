import XCTest
@testable import Brikly

final class BriklyTests: XCTestCase {
    func testCurrencyFormatterFull() {
        XCTAssertEqual(CurrencyFormatter.format(1234.56), "$1,234.56")
        XCTAssertEqual(CurrencyFormatter.format(0), "$0")
    }

    func testCurrencyFormatterCompact() {
        XCTAssertEqual(CurrencyFormatter.compact(500), "$500")
        XCTAssertEqual(CurrencyFormatter.compact(1500), "$1.5K")
        XCTAssertEqual(CurrencyFormatter.compact(2_500_000), "$2.5M")
    }

    func testProjectStatusMapping() {
        XCTAssertEqual(ProjectStatus(rawValue: "active"), .active)
        XCTAssertEqual(ProjectStatus(rawValue: "on_hold"), .onHold)
        XCTAssertNil(ProjectStatus(rawValue: "some_new_status"))
    }

    func testTaskStatusMapping() {
        XCTAssertEqual(TaskStatus(rawValue: "in_progress"), .inProgress)
        XCTAssertEqual(TaskStatus(rawValue: "pending"), .pending)
    }

    func testDateFormattingIsoDate() {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)

        let date = formatter.date(from: "2024-06-15")!
        XCTAssertEqual(DateFormatting.isoDate(date), "2024-06-15")
    }
}

import XCTest

final class BuildDeskUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLoginScreenAppears() throws {
        let app = XCUIApplication()
        app.launch()

        // Verify the login screen shows
        XCTAssertTrue(app.staticTexts["BuildDesk"].exists)
        XCTAssertTrue(app.textFields["Email"].exists)
        XCTAssertTrue(app.secureTextFields["Password"].exists)
        XCTAssertTrue(app.buttons["Sign In"].exists)
    }
}

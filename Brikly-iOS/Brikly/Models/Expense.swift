import Foundation

struct Expense: Codable, Identifiable, Hashable, Sendable {
    let id: String
    var amount: Double
    var taxAmount: Double?
    var description: String
    var expenseDate: String          // PostgreSQL `date`
    var vendorName: String?
    var paymentMethod: String?
    var paymentStatus: String?
    var isBillable: Bool?
    var projectId: String?
    let companyId: String
    var costCodeId: String?
    var createdBy: String?
    let createdAt: Date
}

/// `payment_method` values offered by `ExpenseTracker.tsx`. Stored as the
/// display string, so the raw value is the label.
enum PaymentMethod: String, CaseIterable {
    case cash = "Cash"
    case check = "Check"
    case creditCard = "Credit Card"
    case debitCard = "Debit Card"
    case wire = "Wire Transfer"
    case ach = "ACH"
    case companyAccount = "Company Account"
}

struct NewExpense: Codable, Sendable {
    let companyId: String
    let projectId: String
    var siteId: String?
    var vendorName: String?
    var amount: Double
    var taxAmount: Double
    var expenseDate: String
    var paymentMethod: String
    var paymentStatus: String = "pending"
    var description: String
    var isBillable: Bool
    var costCodeId: String?
    var createdBy: String?

    enum CodingKeys: String, CodingKey {
        case companyId = "company_id"
        case projectId = "project_id"
        case siteId = "site_id"
        case vendorName = "vendor_name"
        case amount
        case taxAmount = "tax_amount"
        case expenseDate = "expense_date"
        case paymentMethod = "payment_method"
        case paymentStatus = "payment_status"
        case description
        case isBillable = "is_billable"
        case costCodeId = "cost_code_id"
        case createdBy = "created_by"
    }
}

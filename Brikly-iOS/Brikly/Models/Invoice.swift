import Foundation

struct Invoice: Codable, Identifiable, Hashable, Sendable {
    let id: String
    var invoiceNumber: String
    var invoiceType: String?
    var status: String
    var issueDate: String
    var dueDate: String
    var subtotal: Double?
    var taxAmount: Double?
    var totalAmount: Double
    var amountPaid: Double?
    var amountDue: Double?
    var clientName: String?
    var clientEmail: String?
    var projectId: String?
    var sentAt: Date?
    var paidAt: Date?

    var balance: Double { amountDue ?? max(0, totalAmount - (amountPaid ?? 0)) }

    /// Past due and not settled. Nothing on the server sets `overdue`, so
    /// the app works it out from the due date.
    var isPastDue: Bool {
        guard status != "paid", status != "cancelled", status != "draft", balance > 0 else { return false }
        return String(dueDate.prefix(10)) < DateFormatting.localISODate(.now)
    }

    var displayStatus: String { isPastDue ? "overdue" : status }
}

struct InvoiceLineItem: Codable, Identifiable, Hashable, Sendable {
    let id: String
    var description: String
    var quantity: Double
    var unitPrice: Double
    var lineTotal: Double?
    var totalPrice: Double?

    var amount: Double { lineTotal ?? totalPrice ?? quantity * unitPrice }
}

struct InvoicePayment: Codable, Identifiable, Hashable, Sendable {
    let id: String
    var paymentAmount: Double
    var paymentDate: String?
    var paymentMethod: String?
    var referenceNumber: String?
    var notes: String?
}

/// Roles that may record payments and send invoices, matching
/// record_invoice_payment (20260926030000) and send-invoice.
enum InvoicePermissions {
    static let financeRoles: Set<String> = ["admin", "project_manager", "accounting", "office_staff", "root_admin"]
}

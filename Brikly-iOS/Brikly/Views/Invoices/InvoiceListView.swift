import SwiftUI

@Observable
@MainActor
final class InvoiceListViewModel {
    var invoices: [Invoice] = []
    var isLoading = false
    var errorMessage: String?

    private let service = InvoiceService()

    var outstanding: Double { invoices.filter { $0.status != "cancelled" && $0.status != "draft" }.reduce(0) { $0 + $1.balance } }
    var pastDue: Double { invoices.filter(\.isPastDue).reduce(0) { $0 + $1.balance } }

    func load(projectId: String) async {
        isLoading = invoices.isEmpty
        errorMessage = nil
        defer { isLoading = false }
        do {
            invoices = try await service.invoices(projectId: projectId)
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "Invoices")
        }
    }
}

struct InvoiceListView: View {
    let projectId: String

    @State private var viewModel = InvoiceListViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView(message: "Loading invoices...")
            } else if let error = viewModel.errorMessage, viewModel.invoices.isEmpty {
                ErrorView(message: error) { await viewModel.load(projectId: projectId) }
            } else if viewModel.invoices.isEmpty {
                EmptyStateView(icon: "doc.text", title: "No Invoices", message: "Invoices for this project are created on the web and tracked here.")
            } else {
                List {
                    Section {
                        LabeledContent("Outstanding", value: CurrencyFormatter.format(viewModel.outstanding))
                        if viewModel.pastDue > 0 {
                            LabeledContent("Past due") {
                                Text(CurrencyFormatter.format(viewModel.pastDue)).foregroundStyle(Color.brandDanger)
                            }
                        }
                    }
                    Section {
                        ForEach(viewModel.invoices) { invoice in
                            NavigationLink {
                                InvoiceDetailView(invoice: invoice) { await viewModel.load(projectId: projectId) }
                            } label: {
                                InvoiceRowView(invoice: invoice)
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .refreshable { await viewModel.load(projectId: projectId) }
            }
        }
        .navigationTitle("Invoices")
        .task { await viewModel.load(projectId: projectId) }
    }
}

private struct InvoiceRowView: View {
    let invoice: Invoice

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(invoice.invoiceNumber).font(.body.weight(.medium)).monospacedDigit()
                Spacer()
                Text(CurrencyFormatter.format(invoice.totalAmount)).font(.body.monospacedDigit())
            }
            HStack(spacing: 8) {
                StatusBadge(status: invoice.displayStatus)
                Text("Due \(DateFormatting.displayDate(invoice.dueDate))")
                if invoice.balance > 0, invoice.balance < invoice.totalAmount {
                    Text("\(CurrencyFormatter.format(invoice.balance)) left")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }
}

struct InvoiceDetailView: View {
    let onChange: () async -> Void

    @Environment(AuthViewModel.self) private var auth
    @State private var invoice: Invoice
    @State private var lineItems: [InvoiceLineItem] = []
    @State private var payments: [InvoicePayment] = []
    @State private var showingPayment = false
    @State private var showingSend = false
    @State private var message: String?
    @State private var errorMessage: String?

    private let service = InvoiceService()
    private var canManage: Bool { InvoicePermissions.financeRoles.contains(auth.userRole) }

    init(invoice: Invoice, onChange: @escaping () async -> Void) {
        _invoice = State(initialValue: invoice)
        self.onChange = onChange
    }

    var body: some View {
        List {
            Section {
                LabeledContent("Status") { StatusBadge(status: invoice.displayStatus) }
                if let client = invoice.clientName { LabeledContent("Client", value: client) }
                LabeledContent("Issued", value: DateFormatting.displayDate(invoice.issueDate))
                LabeledContent("Due", value: DateFormatting.displayDate(invoice.dueDate))
                if let sent = invoice.sentAt {
                    LabeledContent("Sent", value: sent.formatted(date: .abbreviated, time: .omitted))
                }
            }
            Section("Amounts") {
                if let subtotal = invoice.subtotal { LabeledContent("Subtotal", value: CurrencyFormatter.format(subtotal)) }
                if let tax = invoice.taxAmount, tax > 0 { LabeledContent("Tax", value: CurrencyFormatter.format(tax)) }
                LabeledContent("Total", value: CurrencyFormatter.format(invoice.totalAmount))
                LabeledContent("Paid", value: CurrencyFormatter.format(invoice.amountPaid ?? 0))
                LabeledContent("Balance") {
                    Text(CurrencyFormatter.format(invoice.balance)).fontWeight(.semibold)
                }
            }
            if !lineItems.isEmpty {
                Section("Line Items") {
                    ForEach(lineItems) { item in
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.description).lineLimit(3)
                                Text("\(MaterialListViewModel.format(item.quantity)) x \(CurrencyFormatter.format(item.unitPrice))")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(CurrencyFormatter.format(item.amount)).monospacedDigit()
                        }
                    }
                }
            }
            if !payments.isEmpty {
                Section("Payments") {
                    ForEach(payments) { payment in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(DateFormatting.displayDate(payment.paymentDate))
                                Text([payment.paymentMethod?.capitalized, payment.referenceNumber].compactMap { $0 }.joined(separator: " · "))
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(CurrencyFormatter.format(payment.paymentAmount)).monospacedDigit()
                        }
                    }
                }
            }
            if canManage {
                Section {
                    if invoice.balance > 0 && invoice.status != "cancelled" && invoice.status != "draft" {
                        Button { showingPayment = true } label: { Label("Record Payment", systemImage: "banknote") }
                    }
                    if invoice.status != "paid" && invoice.status != "cancelled" {
                        Button { showingSend = true } label: {
                            Label(invoice.sentAt == nil ? "Send to Client" : "Resend to Client", systemImage: "paperplane")
                        }
                    }
                }
            }
            if let message {
                Section { Label(message, systemImage: "checkmark.circle").foregroundStyle(Color.brandSuccess) }
            }
            if let errorMessage {
                Section { Text(errorMessage).foregroundStyle(Color.brandDanger) }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(invoice.invoiceNumber)
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadDetail() }
        .refreshable { await loadDetail() }
        .sheet(isPresented: $showingPayment) {
            RecordPaymentSheet(balance: invoice.balance) { amount, notes in
                await recordPayment(amount: amount, notes: notes)
            }
        }
        .sheet(isPresented: $showingSend) {
            SendInvoiceSheet(defaultEmail: invoice.clientEmail) { to, note in
                await send(to: to, message: note)
            }
        }
    }

    private func loadDetail() async {
        let service = self.service
        let id = invoice.id
        async let items = service.lineItems(invoiceId: id)
        async let paid = service.payments(invoiceId: id)
        let freshItems = try? await items
        if let freshItems { lineItems = freshItems }
        let freshPayments = try? await paid
        if let freshPayments { payments = freshPayments }
    }

    private func refreshInvoice() async {
        await onChange()
        await loadDetail()
    }

    private func recordPayment(amount: Double, notes: String?) async -> Bool {
        errorMessage = nil
        do {
            try await service.recordPayment(invoiceId: invoice.id, amount: amount, notes: notes)
            message = "Payment of \(CurrencyFormatter.format(amount)) recorded."
            // Before touching amountPaid: balance falls back to it when
            // amountDue is nil, and would subtract the payment twice.
            let newDue = max(0, invoice.balance - amount)
            invoice.amountPaid = (invoice.amountPaid ?? 0) + amount
            invoice.amountDue = newDue
            if newDue == 0 { invoice.status = "paid" }
            await refreshInvoice()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    private func send(to: String?, message note: String?) async -> Bool {
        errorMessage = nil
        do {
            try await service.send(invoiceId: invoice.id, to: to, message: note)
            message = "Sent to \(to ?? invoice.clientEmail ?? "the client")."
            if invoice.status == "draft" { invoice.status = "sent" }
            invoice.sentAt = invoice.sentAt ?? .now
            await onChange()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}

private struct RecordPaymentSheet: View {
    let balance: Double
    let onSave: (Double, String?) async -> Bool

    @Environment(\.dismiss) private var dismiss
    @State private var amount = ""
    @State private var method = "Check"
    @State private var reference = ""
    @State private var isSaving = false

    private var value: Double? { NumberInput.double(amount) }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Amount", text: $amount).keyboardType(.decimalPad)
                    Button("Full balance (\(CurrencyFormatter.format(balance)))") {
                        amount = String(format: "%.2f", balance)
                    }
                } footer: {
                    Text("For a check, cash or bank transfer received outside Brikly.")
                }
                Section("Details") {
                    Picker("Method", selection: $method) {
                        ForEach(["Check", "Cash", "ACH", "Wire Transfer", "Other"], id: \.self) { Text($0) }
                    }
                    TextField("Check or reference number", text: $reference)
                }
            }
            .navigationTitle("Record Payment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            guard let value else { return }
                            isSaving = true
                            let notes = [method, reference.isEmpty ? nil : "#\(reference)"].compactMap { $0 }.joined(separator: " ")
                            let ok = await onSave(value, notes)
                            isSaving = false
                            if ok { dismiss() }
                        }
                    }
                    .disabled((value ?? 0) <= 0 || (value ?? 0) > balance + 0.005 || isSaving)
                }
            }
        }
    }
}

private struct SendInvoiceSheet: View {
    let defaultEmail: String?
    let onSend: (String?, String?) async -> Bool

    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var note = ""
    @State private var isSending = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Client email", text: $email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } footer: {
                    Text("The client gets a link to view and pay the invoice in their portal.")
                }
                Section("Message (optional)") {
                    TextField("Note to the client", text: $note, axis: .vertical).lineLimit(2...6)
                }
            }
            .navigationTitle("Send Invoice")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear { if email.isEmpty { email = defaultEmail ?? "" } }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Send") {
                        Task {
                            isSending = true
                            let trimmed = email.trimmingCharacters(in: .whitespaces)
                            let ok = await onSend(
                                trimmed.isEmpty || trimmed == defaultEmail ? nil : trimmed,
                                note.isEmpty ? nil : note
                            )
                            isSending = false
                            if ok { dismiss() }
                        }
                    }
                    .disabled(isSending || !email.contains("@"))
                }
            }
        }
    }
}

import SwiftUI

struct ExpenseListView: View {
    let projectId: String
    let companyId: String
    let siteId: String?

    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel = RecordListViewModel<Expense>(table: "expenses", orderBy: "expense_date")
    @State private var showingForm = false

    private var total: Double { viewModel.records.reduce(0) { $0 + $1.amount + ($1.taxAmount ?? 0) } }

    var body: some View {
        VStack(spacing: 0) {
            RecordListContainer(
                isLoading: viewModel.isLoading,
                errorMessage: viewModel.errorMessage,
                isEmpty: viewModel.records.isEmpty,
                emptyIcon: "creditcard",
                emptyTitle: "No Expenses",
                emptyMessage: "Log fuel, materials runs and other job spend as it happens.",
                retry: { await viewModel.load(projectId: projectId) }
            ) {
                List {
                    Section {
                        LabeledContent("Total logged", value: CurrencyFormatter.format(total))
                            .font(.headline)
                    }
                    Section {
                        ForEach(viewModel.records) { expense in
                            ExpenseRowView(expense: expense)
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .refreshable { await viewModel.load(projectId: projectId) }
            }
            SaveNoticeView(notice: viewModel.notice, error: viewModel.records.isEmpty ? nil : viewModel.errorMessage)
        }
        .navigationTitle("Expenses")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showingForm = true } label: { Image(systemName: "plus") }
                    .accessibilityLabel("Add expense")
            }
        }
        .sheet(isPresented: $showingForm) {
            ExpenseFormView(projectId: projectId, companyId: companyId, siteId: siteId, createdBy: auth.userProfile?.id) { expense in
                await viewModel.create(expense, offlineEntity: "expense") != .failed
            }
        }
        .task { await viewModel.load(projectId: projectId) }
    }
}

private struct ExpenseRowView: View {
    let expense: Expense

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text(expense.vendorName?.isEmpty == false ? expense.vendorName! : expense.description)
                    .font(.body.weight(.medium))
                    .lineLimit(1)
                HStack(spacing: 8) {
                    Text(DateFormatting.displayDate(expense.expenseDate))
                    if let method = expense.paymentMethod { Text(method) }
                    if expense.isBillable == true { Text("Billable").fontWeight(.semibold) }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(CurrencyFormatter.format(expense.amount + (expense.taxAmount ?? 0)))
                    .font(.body.monospacedDigit())
                StatusBadge(status: expense.paymentStatus ?? "pending")
            }
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}

private struct ExpenseFormView: View {
    let projectId: String
    let companyId: String
    let siteId: String?
    let createdBy: String?
    let onSave: (NewExpense) async -> Bool

    @Environment(\.dismiss) private var dismiss
    @State private var vendor = ""
    @State private var amount = ""
    @State private var tax = ""
    @State private var date = Date()
    @State private var method = PaymentMethod.companyAccount.rawValue
    @State private var description = ""
    @State private var isBillable = false
    @State private var isSaving = false
    @State private var failed = false

    private var amountValue: Double? { NumberInput.double(amount) }

    var body: some View {
        NavigationStack {
            Form {
                Section("Purchase") {
                    TextField("Vendor", text: $vendor)
                    TextField("What was it for", text: $description)
                    DatePicker("Date", selection: $date, in: ...Date(), displayedComponents: .date)
                }
                Section("Amount") {
                    TextField("Amount", text: $amount).keyboardType(.decimalPad)
                    TextField("Tax", text: $tax).keyboardType(.decimalPad)
                    Picker("Paid with", selection: $method) {
                        ForEach(PaymentMethod.allCases, id: \.rawValue) { Text($0.rawValue).tag($0.rawValue) }
                    }
                    Toggle("Bill to client", isOn: $isBillable)
                }
                if failed {
                    Section { Text("Couldn't save the expense. Try again.").foregroundStyle(Color.brandDanger) }
                }
            }
            .navigationTitle("New Expense")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled((amountValue ?? 0) <= 0
                                  || description.trimmingCharacters(in: .whitespaces).isEmpty
                                  || isSaving)
                }
            }
        }
    }

    private func save() async {
        guard let value = amountValue else { return }
        isSaving = true
        defer { isSaving = false }
        let expense = NewExpense(
            companyId: companyId,
            projectId: projectId,
            siteId: siteId,
            vendorName: vendor.isEmpty ? nil : vendor,
            amount: value,
            taxAmount: NumberInput.double(tax) ?? 0,
            expenseDate: DateFormatting.localISODate(date),
            paymentMethod: method,
            description: description.trimmingCharacters(in: .whitespaces),
            isBillable: isBillable,
            costCodeId: nil,
            createdBy: createdBy
        )
        if await onSave(expense) { dismiss() } else { failed = true }
    }
}

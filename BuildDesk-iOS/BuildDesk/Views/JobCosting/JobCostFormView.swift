import SwiftUI

struct JobCostFormView: View {
    let projectId: String
    let costCodes: [CostCode]
    let onSave: (NewJobCost) async -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var selectedCostCodeId = ""
    @State private var date = Date()
    @State private var description = ""
    @State private var laborCost = ""
    @State private var laborHours = ""
    @State private var materialCost = ""
    @State private var equipmentCost = ""
    @State private var otherCost = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Cost Code") {
                    if costCodes.isEmpty {
                        Text("No cost codes available")
                            .foregroundStyle(.secondary)
                    } else {
                        Picker("Cost Code", selection: $selectedCostCodeId) {
                            Text("Select...").tag("")
                            ForEach(costCodes) { code in
                                Text(code.displayName).tag(code.id)
                            }
                        }
                    }
                }

                Section("Date") {
                    DatePicker("Date", selection: $date, displayedComponents: .date)
                }

                Section("Description") {
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(2...4)
                }

                Section("Costs") {
                    CurrencyField(label: "Labor Cost", text: $laborCost)
                    TextField("Labor Hours", text: $laborHours)
                        .keyboardType(.decimalPad)
                    CurrencyField(label: "Material Cost", text: $materialCost)
                    CurrencyField(label: "Equipment Cost", text: $equipmentCost)
                    CurrencyField(label: "Other Cost", text: $otherCost)
                }

                if computedTotal > 0 {
                    Section {
                        HStack {
                            Text("Total")
                                .fontWeight(.semibold)
                            Spacer()
                            CurrencyText(amount: computedTotal)
                                .fontWeight(.semibold)
                        }
                    }
                }
            }
            .navigationTitle("New Cost Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        Task { await save() }
                    }
                    .disabled(selectedCostCodeId.isEmpty || isSaving)
                }
            }
        }
    }

    private var computedTotal: Double {
        let labor: Double = Double(laborCost) ?? 0
        let material: Double = Double(materialCost) ?? 0
        let equipment: Double = Double(equipmentCost) ?? 0
        let other: Double = Double(otherCost) ?? 0
        return labor + material + equipment + other
    }

    private func save() async {
        isSaving = true

        let cost = NewJobCost(
            projectId: projectId,
            costCodeId: selectedCostCodeId,
            date: DateFormatting.isoDate(date),
            description: description.isEmpty ? nil : description,
            laborCost: Double(laborCost),
            laborHours: Double(laborHours),
            materialCost: Double(materialCost),
            equipmentCost: Double(equipmentCost),
            otherCost: Double(otherCost)
        )

        await onSave(cost)
        isSaving = false
        dismiss()
    }
}

private struct CurrencyField: View {
    let label: String
    @Binding var text: String

    var body: some View {
        HStack {
            Text(label)
            Spacer()
            TextField("0.00", text: $text)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 120)
        }
    }
}

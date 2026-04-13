import SwiftUI

struct JobCostRowView: View {
    let cost: JobCost
    let costCode: CostCode?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(costCode?.displayName ?? "Unknown Code")
                        .font(.body.weight(.medium))
                    Text(cost.date)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                CurrencyText(amount: cost.effectiveTotal)
                    .font(.body.weight(.semibold))
            }

            if let desc = cost.description, !desc.isEmpty {
                Text(desc)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            // Cost breakdown
            HStack(spacing: 12) {
                if let labor = cost.laborCost, labor > 0 {
                    CostChip(label: "Labor", amount: labor, color: .blue)
                }
                if let material = cost.materialCost, material > 0 {
                    CostChip(label: "Material", amount: material, color: .green)
                }
                if let equip = cost.equipmentCost, equip > 0 {
                    CostChip(label: "Equip", amount: equip, color: .orange)
                }
                if let other = cost.otherCost, other > 0 {
                    CostChip(label: "Other", amount: other, color: .purple)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

private struct CostChip: View {
    let label: String
    let amount: Double
    let color: Color

    var body: some View {
        Text("\(label): \(CurrencyFormatter.compact(amount))")
            .font(.caption2)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.12))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}

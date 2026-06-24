import SwiftUI

struct JobCostSummaryView: View {
    let viewModel: JobCostListViewModel

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text("Total Costs")
                    .font(.subheadline.weight(.medium))
                Spacer()
                CurrencyText(amount: viewModel.grandTotal)
                    .font(.title3.weight(.bold))
            }

            HStack(spacing: 16) {
                SummaryItem(label: "Labor", amount: viewModel.totalLabor, color: .blue)
                SummaryItem(label: "Material", amount: viewModel.totalMaterial, color: .green)
                SummaryItem(label: "Equip", amount: viewModel.totalEquipment, color: .orange)
                SummaryItem(label: "Other", amount: viewModel.totalOther, color: .purple)
            }
        }
        .padding()
        .background(.fill.tertiary)
    }
}

private struct SummaryItem: View {
    let label: String
    let amount: Double
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text(CurrencyFormatter.compact(amount))
                .font(.caption.weight(.semibold))
                .foregroundStyle(color)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

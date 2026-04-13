import SwiftUI

struct CurrencyText: View {
    let amount: Double
    var compact: Bool = false

    var body: some View {
        Text(compact ? CurrencyFormatter.compact(amount) : CurrencyFormatter.format(amount))
    }
}

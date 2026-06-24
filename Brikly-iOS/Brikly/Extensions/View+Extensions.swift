import SwiftUI

extension View {
    /// Apply a card-style background.
    func cardStyle() -> some View {
        self
            .padding()
            .background(.fill.tertiary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

import SwiftUI

struct FilterOption: Hashable {
    let value: String
    let label: String
}

/// Horizontal "All / A / B / ..." filter chips over a list. `selected` is
/// nil for All; tapping the selected chip clears it.
struct ChipFilterBar: View {
    let options: [FilterOption]
    @Binding var selected: String?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip("All", isSelected: selected == nil) { selected = nil }
                ForEach(options, id: \.value) { option in
                    chip(option.label, isSelected: selected == option.value) {
                        selected = selected == option.value ? nil : option.value
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(.bar)
    }

    private func chip(_ label: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.accentColor : Color(.tertiarySystemFill))
                .foregroundStyle(isSelected ? Color.white : Color.primary)
                .clipShape(Capsule())
        }
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

/// Loading / error / empty / content switch shared by the record lists.
struct RecordListContainer<Content: View>: View {
    let isLoading: Bool
    let errorMessage: String?
    let isEmpty: Bool
    let emptyIcon: String
    let emptyTitle: String
    let emptyMessage: String
    let retry: () async -> Void
    @ViewBuilder let content: Content

    var body: some View {
        if isLoading {
            LoadingView()
        } else if let errorMessage, isEmpty {
            ErrorView(message: errorMessage, retryAction: retry)
        } else if isEmpty {
            EmptyStateView(icon: emptyIcon, title: emptyTitle, message: emptyMessage)
        } else {
            content
        }
    }
}

/// Footer line for a queued offline write or a failed save.
struct SaveNoticeView: View {
    let notice: String?
    let error: String?

    var body: some View {
        if let error {
            Label(error, systemImage: "exclamationmark.triangle.fill")
                .font(.footnote)
                .foregroundStyle(Color.brandDanger)
                .padding(.horizontal)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.bar)
        } else if let notice {
            Label(notice, systemImage: "icloud.and.arrow.up")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .padding(.horizontal)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.bar)
        }
    }
}

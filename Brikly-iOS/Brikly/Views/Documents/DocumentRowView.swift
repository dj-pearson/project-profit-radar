import SwiftUI

struct DocumentRowView: View {
    let document: ProjectDocument
    let getURL: () async -> URL?

    @State private var isLoading = false

    var body: some View {
        Button {
            Task { await openDocument() }
        } label: {
            HStack(spacing: 12) {
                // File type icon
                Image(systemName: document.iconName)
                    .font(.title2)
                    .foregroundStyle(.accent)
                    .frame(width: 36)

                VStack(alignment: .leading, spacing: 4) {
                    Text(document.name)
                        .font(.body.weight(.medium))
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    HStack(spacing: 8) {
                        Text(document.formattedSize)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        if let version = document.version {
                            Text("v\(version)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        if let ext = document.fileType, !ext.isEmpty {
                            Text(ext.uppercased())
                                .font(.caption2.weight(.medium))
                                .padding(.horizontal, 4)
                                .padding(.vertical, 1)
                                .background(.fill.tertiary)
                                .clipShape(RoundedRectangle(cornerRadius: 3))
                        }
                    }
                }

                Spacer()

                if isLoading {
                    ProgressView()
                } else {
                    Image(systemName: "arrow.down.circle")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func openDocument() async {
        isLoading = true
        if let url = await getURL() {
            await MainActor.run {
                UIApplication.shared.open(url)
            }
        }
        isLoading = false
    }
}

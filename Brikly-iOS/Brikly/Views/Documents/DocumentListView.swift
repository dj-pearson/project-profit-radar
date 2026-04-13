import SwiftUI

struct DocumentListView: View {
    let projectId: String

    @State private var viewModel = DocumentListViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.documents.isEmpty {
                LoadingView(message: "Loading documents...")
            } else if let error = viewModel.errorMessage, viewModel.documents.isEmpty {
                ErrorView(message: error) {
                    await viewModel.loadDocuments(projectId: projectId)
                }
            } else if viewModel.documents.isEmpty {
                EmptyStateView(
                    icon: "folder",
                    title: "No Documents",
                    message: "Documents uploaded in Brikly will appear here."
                )
            } else {
                List {
                    ForEach(viewModel.documents) { doc in
                        DocumentRowView(document: doc) {
                            await viewModel.signedURL(for: doc)
                        }
                    }
                }
                .listStyle(.plain)
                .refreshable { await viewModel.loadDocuments(projectId: projectId) }
            }
        }
        .task { await viewModel.loadDocuments(projectId: projectId) }
    }
}

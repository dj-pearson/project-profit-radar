import SwiftUI
import PhotosUI

struct DocumentListView: View {
    let projectId: String
    let companyId: String
    let siteId: String?

    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel = DocumentListViewModel()
    @State private var pickedItem: PhotosPickerItem?
    @State private var isUploading = false

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
                    message: "Tap + to upload your first photo or document."
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
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                PhotosPicker(selection: $pickedItem, matching: .images, photoLibrary: .shared()) {
                    if isUploading {
                        ProgressView()
                    } else {
                        Image(systemName: "plus")
                    }
                }
                .disabled(isUploading)
                .accessibilityLabel("Upload photo")
            }
        }
        .task { await viewModel.loadDocuments(projectId: projectId) }
        .onChange(of: pickedItem) { _, newItem in
            guard let newItem else { return }
            Task { await handlePicked(item: newItem) }
        }
    }

    private func handlePicked(item: PhotosPickerItem) async {
        isUploading = true
        defer {
            isUploading = false
            pickedItem = nil
        }

        do {
            guard let data = try await item.loadTransferable(type: Data.self) else {
                viewModel.errorMessage = "Could not read the selected photo."
                return
            }
            // PhotosPickerItem doesn't expose the original filename — synthesize one.
            // The asset's UTType (item.supportedContentTypes.first) usually carries the extension.
            let ext = item.supportedContentTypes.first?.preferredFilenameExtension ?? "jpg"
            let mime = item.supportedContentTypes.first?.preferredMIMEType ?? "image/jpeg"
            let timestamp = Int(Date().timeIntervalSince1970)
            let fileName = "photo-\(timestamp).\(ext)"

            await viewModel.uploadDocument(
                bytes: data,
                fileName: fileName,
                contentType: mime,
                projectId: projectId,
                companyId: companyId,
                siteId: siteId,
                uploadedBy: auth.userProfile?.id
            )
        } catch {
            viewModel.errorMessage = "Photo upload failed: \(error.localizedDescription)"
        }
    }
}

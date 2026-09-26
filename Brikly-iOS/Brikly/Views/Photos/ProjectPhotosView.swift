import PhotosUI
import SwiftUI
import UIKit

struct ProjectPhotosView: View {
    let project: Project
    let companyId: String

    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel = ProjectPhotosViewModel()
    @State private var libraryItems: [PhotosPickerItem] = []
    @State private var showingLibrary = false
    @State private var showingCamera = false
    /// Held until the camera cover has finished dismissing; presenting the
    /// upload sheet during the dismissal drops it.
    @State private var captured: UIImage?
    @State private var pending: PendingUpload?
    @State private var viewing: ProjectPhoto?
    @State private var search = ""

    /// Images picked and waiting for caption / source before upload.
    struct PendingUpload: Identifiable {
        let id = UUID()
        var images: [UIImage]
    }

    private let columns = [GridItem(.adaptive(minimum: 104), spacing: 4)]

    private var filteredDays: [PhotoDay] {
        let q = search.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return viewModel.byDay }
        return viewModel.byDay.compactMap { group in
            let hits = group.photos.filter {
                ($0.caption ?? "").lowercased().contains(q)
                    || ($0.aiTags ?? []).contains { $0.lowercased().contains(q) }
            }
            return hits.isEmpty ? nil : PhotoDay(day: group.day, photos: hits)
        }
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView(message: "Loading photos...")
            } else if let error = viewModel.errorMessage, viewModel.photos.isEmpty {
                ErrorView(message: error) { await viewModel.load(projectId: project.id) }
            } else if viewModel.photos.isEmpty {
                EmptyStateView(
                    icon: "camera",
                    title: "No Photos",
                    message: "Take progress, punch and safety photos here. They show up on the web project too."
                )
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 16, pinnedViews: [.sectionHeaders]) {
                        ForEach(filteredDays) { group in
                            Section {
                                LazyVGrid(columns: columns, spacing: 4) {
                                    ForEach(group.photos) { photo in
                                        thumbnail(photo)
                                    }
                                }
                            } header: {
                                Text(group.day.formatted(date: .complete, time: .omitted))
                                    .font(.subheadline.weight(.semibold))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.vertical, 6)
                                    .background(.bar)
                            }
                        }
                    }
                    .padding(.horizontal, 4)
                }
                .searchable(text: $search, prompt: "Caption or tag")
                .refreshable { await viewModel.load(projectId: project.id) }
            }
        }
        .safeAreaInset(edge: .bottom) {
            if let progress = viewModel.uploadProgress {
                ProgressView(value: Double(progress.done), total: Double(max(progress.total, 1))) {
                    Text("Uploading \(progress.done) of \(progress.total)")
                        .font(.footnote)
                }
                .padding()
                .background(.bar)
            } else if let error = viewModel.errorMessage, !viewModel.photos.isEmpty {
                SaveNoticeView(notice: nil, error: error)
            }
        }
        .navigationTitle("Photos")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    if CameraPicker.isAvailable {
                        Button { showingCamera = true } label: { Label("Take Photo", systemImage: "camera") }
                    }
                    Button { showingLibrary = true } label: { Label("Choose from Library", systemImage: "photo.on.rectangle") }
                } label: {
                    Image(systemName: "plus")
                }
                .accessibilityLabel("Add photos")
                .disabled(viewModel.uploadProgress != nil)
            }
        }
        .photosPicker(isPresented: $showingLibrary, selection: $libraryItems, maxSelectionCount: 10, matching: .images)
        .onChange(of: libraryItems) {
            let items = libraryItems
            guard !items.isEmpty else { return }
            libraryItems = []
            Task {
                var images: [UIImage] = []
                for item in items {
                    let data = try? await item.loadTransferable(type: Data.self)
                    if let data, let image = PhotoProcessing.downscaled(data: data) {
                        images.append(image)
                    }
                }
                if !images.isEmpty { pending = PendingUpload(images: images) }
            }
        }
        .fullScreenCover(isPresented: $showingCamera, onDismiss: {
            if let image = captured {
                captured = nil
                pending = PendingUpload(images: [image])
            }
        }) {
            CameraPicker(onCapture: { image in captured = image }, onFinish: { showingCamera = false })
                .ignoresSafeArea()
        }
        .sheet(item: $pending) { upload in
            PhotoUploadSheet(images: upload.images, reports: viewModel.recentReports) { images, source, caption, reportId in
                guard let userId = auth.userProfile?.id else { return images.indices.map { $0 } }
                return await viewModel.upload(
                    images,
                    projectId: project.id,
                    companyId: companyId,
                    userId: userId,
                    source: source,
                    caption: caption,
                    dailyReportId: reportId
                )
            }
        }
        .sheet(item: $viewing) { photo in
            PhotoViewer(photo: photo, url: viewModel.urls[photo.id])
        }
        .task { await viewModel.load(projectId: project.id) }
    }

    private func thumbnail(_ photo: ProjectPhoto) -> some View {
        Button { viewing = photo } label: {
            Color(.secondarySystemFill)
                .aspectRatio(1, contentMode: .fit)
                .overlay {
                    AsyncImage(url: viewModel.urls[photo.id]) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFill()
                        case .failure:
                            Image(systemName: "photo").foregroundStyle(.secondary)
                        default:
                            ProgressView()
                        }
                    }
                }
                .clipped()
                .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(photo.caption ?? "Photo")
    }
}

private struct PhotoUploadSheet: View {
    let reports: [DailyReport]
    /// Uploads the given images; returns the indices that did not upload.
    /// An empty result closes the sheet.
    let onUpload: ([UIImage], PhotoSource, String?, String?) async -> [Int]

    @Environment(\.dismiss) private var dismiss
    /// Only what hasn't uploaded yet, so a retry never duplicates a photo.
    @State private var images: [UIImage]
    @State private var source = PhotoSource.progress
    @State private var caption = ""
    @State private var reportId = ""
    @State private var isUploading = false
    @State private var failed = false

    init(images: [UIImage], reports: [DailyReport], onUpload: @escaping ([UIImage], PhotoSource, String?, String?) async -> [Int]) {
        self.reports = reports
        self.onUpload = onUpload
        _images = State(initialValue: images)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(images.indices, id: \.self) { index in
                                Image(uiImage: images[index])
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 88, height: 88)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                    .accessibilityHidden(true)
                            }
                        }
                    }
                    .listRowInsets(EdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12))
                }
                Section("Details") {
                    TextField("Caption (what, where)", text: $caption, axis: .vertical)
                        .lineLimit(1...4)
                    Picker("Type", selection: $source) {
                        ForEach(PhotoSource.allCases, id: \.self) { Text($0.label).tag($0) }
                    }
                    if !reports.isEmpty {
                        Picker("Daily report", selection: $reportId) {
                            Text("None").tag("")
                            ForEach(reports) { report in
                                Text(DateFormatting.displayDate(report.date)).tag(report.id)
                            }
                        }
                    }
                }
                if failed {
                    Section {
                        Text("\(images.count) photo\(images.count == 1 ? "" : "s") didn't upload. The rest are on the project; Upload retries only these.")
                            .foregroundStyle(Color.brandDanger)
                    }
                }
            }
            .navigationTitle(images.count == 1 ? "Upload Photo" : "Upload \(images.count) Photos")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.disabled(isUploading) }
                ToolbarItem(placement: .confirmationAction) {
                    if isUploading {
                        ProgressView()
                    } else {
                        Button("Upload") { Task { await upload() } }
                    }
                }
            }
            .onChange(of: reportId) {
                if !reportId.isEmpty { source = .dailyReport }
            }
            .interactiveDismissDisabled(isUploading)
        }
    }

    private func upload() async {
        isUploading = true
        defer { isUploading = false }
        let notUploaded = await onUpload(
            images,
            source,
            caption.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : caption,
            reportId.isEmpty ? nil : reportId
        )
        if notUploaded.isEmpty {
            dismiss()
        } else {
            images = notUploaded.map { images[$0] }
            failed = true
        }
    }
}

private struct PhotoViewer: View {
    let photo: ProjectPhoto
    let url: URL?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 12) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image): image.resizable().scaledToFit()
                    case .failure: ContentUnavailableView("Couldn't load photo", systemImage: "photo")
                    default: ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                VStack(alignment: .leading, spacing: 4) {
                    if let caption = photo.caption, !caption.isEmpty {
                        Text(caption).font(.body)
                    }
                    Text(photo.sortDate.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if let tags = photo.aiTags, !tags.isEmpty {
                        Text(tags.joined(separator: ", "))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal)
            }
            .padding(.bottom)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
            }
        }
    }
}

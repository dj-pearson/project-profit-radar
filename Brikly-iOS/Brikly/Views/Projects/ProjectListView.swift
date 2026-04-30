import SwiftUI

struct ProjectListView: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel = ProjectListViewModel()
    @State private var showSettings = false
    @State private var selectedProject: Project?

    var body: some View {
        @Bindable var vm = viewModel

        // NavigationSplitView gives a sidebar+detail layout on iPad/Mac while
        // automatically collapsing to a stack on iPhone (compact size class).
        NavigationSplitView {
            sidebar(vm: vm)
        } detail: {
            NavigationStack {
                if let project = selectedProject {
                    ProjectDetailView(project: project)
                } else {
                    ContentUnavailableView(
                        "Select a Project",
                        systemImage: "folder",
                        description: Text("Choose a project from the list to see its details.")
                    )
                }
            }
        }
        .task { await reload() }
        .sheet(isPresented: $showSettings) {
            SettingsView()
        }
    }

    @ViewBuilder
    private func sidebar(vm: ProjectListViewModel) -> some View {
        Group {
            if viewModel.isLoading && viewModel.projects.isEmpty {
                LoadingView(message: "Loading projects...")
            } else if let error = viewModel.errorMessage, viewModel.projects.isEmpty {
                ErrorView(message: error) {
                    await reload()
                }
            } else if viewModel.groupedProjects.isEmpty {
                EmptyStateView(
                    icon: "folder",
                    title: "No Projects",
                    message: "Projects created in Brikly will appear here."
                )
            } else {
                List(selection: $selectedProject) {
                    ForEach(viewModel.groupedProjects, id: \.status) { group in
                        Section {
                            ForEach(group.projects) { project in
                                NavigationLink(value: project) {
                                    ProjectRowView(project: project)
                                }
                            }
                        } header: {
                            Text(group.status.label)
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .refreshable { await reload() }
            }
        }
        .navigationTitle("Projects")
        .searchable(text: Binding(get: { vm.searchText }, set: { vm.searchText = $0 }),
                    prompt: "Search projects...")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        showSettings = true
                    } label: {
                        Label("Settings", systemImage: "gearshape")
                    }
                    Button(role: .destructive) {
                        Task { await auth.signOut() }
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                } label: {
                    Label("Account", systemImage: "person.circle")
                }
                .accessibilityLabel("Account menu")
            }
        }
    }

    private func reload() async {
        guard let companyId = auth.companyId else { return }
        await viewModel.loadProjects(companyId: companyId)
    }
}

// MARK: - Settings

/// Account settings sheet. Includes the App Store-required account deletion
/// path (Apple guideline 5.1.1(v)). Lives in this file because it is only
/// reachable from `ProjectListView`'s account menu.
struct SettingsView: View {
    @Environment(AuthViewModel.self) private var auth
    @Environment(\.dismiss) private var dismiss

    @State private var showDeleteConfirm = false
    @State private var isDeleting = false
    @State private var deleteError: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
                    if let profile = auth.userProfile {
                        LabeledContent("Name", value: profile.displayName)
                        LabeledContent("Email", value: profile.email)
                        if !profile.role.isEmpty {
                            LabeledContent("Role", value: profile.role)
                        }
                    } else {
                        Text("Not signed in")
                            .foregroundStyle(.secondary)
                    }
                }

                Section {
                    Button(role: .destructive) {
                        Task { await auth.signOut() }
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }

                Section {
                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        if isDeleting {
                            HStack {
                                ProgressView()
                                Text("Submitting…")
                            }
                        } else {
                            Label("Delete Account", systemImage: "trash")
                        }
                    }
                    .disabled(isDeleting)
                } footer: {
                    Text("Submits a deletion request. Your account is locked immediately and permanently deleted after a 30-day grace period during which you can cancel by replying to the confirmation email.")
                }

                if let deleteError {
                    Section {
                        Text(deleteError)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .alert("Delete account?", isPresented: $showDeleteConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    Task { await performDelete() }
                }
            } message: {
                Text("Your account will be locked immediately and permanently deleted after 30 days. You will receive a confirmation email and can cancel by replying within that window.")
            }
        }
    }

    private struct DeleteAccountResponse: Decodable {
        let success: Bool?
        let data: Payload?
        let error: String?

        struct Payload: Decodable {
            let requestId: String?
            let status: String?
            let dueAt: String?
            let locked: Bool?
            let message: String?
        }
    }

    private func performDelete() async {
        isDeleting = true
        deleteError = nil
        defer { isDeleting = false }

        do {
            // `data-subject-delete` records a GDPR/CCPA-compliant deletion request,
            // locks the account out, and schedules permanent deletion after a
            // 30-day grace period. Authorization runs on the user's JWT.
            let result: DeleteAccountResponse = try await SupabaseService.shared.functions
                .invoke("data-subject-delete")

            if let errorMessage = result.error, result.success != true {
                deleteError = errorMessage
                return
            }

            // Account is now locked server-side; sign out clears the local
            // session so the auth state flip routes back to LoginView.
            await auth.signOut()
            dismiss()
        } catch {
            deleteError = "Could not submit deletion request: \(error.localizedDescription)"
        }
    }
}

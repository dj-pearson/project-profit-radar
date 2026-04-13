import SwiftUI

struct ProjectListView: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel = ProjectListViewModel()

    var body: some View {
        @Bindable var vm = viewModel

        NavigationStack {
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
                    List {
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
            .navigationDestination(for: Project.self) { project in
                ProjectDetailView(project: project)
            }
            .searchable(text: $vm.searchText, prompt: "Search projects...")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button(role: .destructive) {
                            Task { await auth.signOut() }
                        } label: {
                            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    } label: {
                        Label("Account", systemImage: "person.circle")
                    }
                }
            }
            .task { await reload() }
        }
    }

    private func reload() async {
        guard let companyId = auth.companyId else { return }
        await viewModel.loadProjects(companyId: companyId)
    }
}

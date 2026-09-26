import SwiftUI

struct HomeView: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel = DashboardViewModel()
    @State private var showSettings = false
    /// Switches the root tab bar to the time clock.
    let openTimeClock: () -> Void

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView(message: "Loading your day...")
                } else if let error = viewModel.errorMessage, viewModel.activeProjects.isEmpty {
                    ErrorView(message: error) { await reload() }
                } else {
                    content
                }
            }
            .navigationTitle(greeting)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: { Image(systemName: "person.circle") }
                        .accessibilityLabel("Account and settings")
                }
            }
            .sheet(isPresented: $showSettings) { SettingsView() }
            .task { await reload() }
        }
    }

    private var content: some View {
        List {
            Section {
                Button(action: openTimeClock) {
                    HStack {
                        Image(systemName: viewModel.clockedInProjectId == nil ? "clock" : "clock.badge.checkmark.fill")
                            .font(.title2)
                            .foregroundStyle(viewModel.clockedInProjectId == nil ? .secondary : Color.brandSuccess)
                            .accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(clockTitle).font(.body.weight(.semibold))
                            Text(String(format: "%.1f h this week", viewModel.weekHours))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right").foregroundStyle(.tertiary).accessibilityHidden(true)
                    }
                }
                .buttonStyle(.plain)
            }

            Section {
                if viewModel.myTasks.isEmpty {
                    Text("Nothing assigned to you.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(viewModel.myTasks.prefix(8)) { task in
                        VStack(alignment: .leading, spacing: 2) {
                            TaskRowView(task: task)
                            if let project = viewModel.project(for: task.projectId) {
                                Text(project.name)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            } header: {
                Text("My Tasks")
            } footer: {
                if viewModel.overdueCount > 0 {
                    Text("\(viewModel.overdueCount) overdue")
                        .foregroundStyle(Color.brandDanger)
                } else if viewModel.myTasks.count > 8 {
                    Text("\(viewModel.myTasks.count - 8) more in your projects")
                }
            }

            Section("Active Projects") {
                if viewModel.activeProjects.isEmpty {
                    Text("No active projects.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(viewModel.activeProjects) { project in
                        NavigationLink {
                            ProjectDetailView(project: project)
                        } label: {
                            ProjectRowView(project: project)
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .refreshable { await reload() }
    }

    private var clockTitle: String {
        guard let projectId = viewModel.clockedInProjectId else { return "Not clocked in" }
        let name = viewModel.project(for: projectId)?.name ?? "a project"
        return "On the clock at \(name)"
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: .now)
        let part = hour < 12 ? "Morning" : (hour < 17 ? "Afternoon" : "Evening")
        if let first = auth.userProfile?.firstName, !first.isEmpty {
            return "\(part), \(first)"
        }
        return "Good \(part.lowercased())"
    }

    private func reload() async {
        guard let userId = auth.userProfile?.id, let companyId = auth.companyId else { return }
        await viewModel.load(userId: userId, companyId: companyId)
    }
}

import SwiftUI

struct ProjectDetailView: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel: ProjectDetailViewModel
    @State private var selectedTab = 0

    init(project: Project) {
        _viewModel = State(initialValue: ProjectDetailViewModel(project: project))
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            ProjectOverviewView(project: viewModel.project)
                .tabItem { Label("Overview", systemImage: "chart.bar.fill") }
                .tag(0)

            TaskListView(
                projectId: viewModel.project.id,
                companyId: auth.companyId ?? "",
                siteId: auth.siteId ?? viewModel.project.siteId ?? ""
            )
            .tabItem { Label("Tasks", systemImage: "checklist") }
            .tag(1)

            DailyReportListView(
                projectId: viewModel.project.id,
                companyId: auth.companyId ?? "",
                siteId: auth.siteId ?? viewModel.project.siteId ?? ""
            )
            .tabItem { Label("Reports", systemImage: "doc.text.fill") }
            .tag(2)

            JobCostListView(
                projectId: viewModel.project.id,
                companyId: auth.companyId ?? ""
            )
            .tabItem { Label("Costs", systemImage: "dollarsign.circle.fill") }
            .tag(3)

            DocumentListView(projectId: viewModel.project.id)
                .tabItem { Label("Docs", systemImage: "folder.fill") }
                .tag(4)
        }
        .navigationTitle(viewModel.project.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

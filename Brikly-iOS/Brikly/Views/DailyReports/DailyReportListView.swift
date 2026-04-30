import SwiftUI

struct DailyReportListView: View {
    let projectId: String
    let companyId: String
    let siteId: String

    @State private var viewModel = DailyReportListViewModel()
    @State private var showingForm = false
    @State private var editingReport: DailyReport?

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.reports.isEmpty {
                LoadingView(message: "Loading reports...")
            } else if let error = viewModel.errorMessage, viewModel.reports.isEmpty {
                ErrorView(message: error) {
                    await viewModel.loadReports(projectId: projectId)
                }
            } else if viewModel.reports.isEmpty {
                EmptyStateView(
                    icon: "doc.text",
                    title: "No Daily Reports",
                    message: "Create your first daily report."
                )
            } else {
                List {
                    ForEach(viewModel.reports) { report in
                        DailyReportRowView(report: report)
                            .contentShape(Rectangle())
                            .onTapGesture { editingReport = report }
                            .accessibilityAddTraits(.isButton)
                            .accessibilityHint("Edit this report")
                    }
                }
                .listStyle(.plain)
                .refreshable { await viewModel.loadReports(projectId: projectId) }
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingForm = true
                } label: {
                    Image(systemName: "plus")
                }
                .accessibilityLabel("Add daily report")
            }
        }
        .sheet(isPresented: $showingForm) {
            DailyReportFormView(
                projectId: projectId,
                companyId: companyId,
                siteId: siteId
            ) { newReport in
                await viewModel.createReport(newReport)
            }
        }
        .sheet(item: $editingReport) { report in
            DailyReportFormView(
                projectId: projectId,
                companyId: companyId,
                siteId: siteId,
                existing: report
            ) { newReport in
                let updates = DailyReportUpdate(
                    crewCount: newReport.crewCount,
                    weatherConditions: newReport.weatherConditions,
                    temperature: newReport.temperature,
                    workPerformed: newReport.workPerformed,
                    delaysIssues: newReport.delaysIssues,
                    safetyIncidents: newReport.safetyIncidents,
                    nextDayPlan: newReport.nextDayPlan
                )
                await viewModel.updateReport(id: report.id, updates: updates)
            }
        }
        .task { await viewModel.loadReports(projectId: projectId) }
    }
}

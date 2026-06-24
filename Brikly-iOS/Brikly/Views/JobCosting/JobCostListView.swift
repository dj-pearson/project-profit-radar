import SwiftUI

struct JobCostListView: View {
    let projectId: String
    let companyId: String

    @State private var viewModel = JobCostListViewModel()
    @State private var showingForm = false

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.jobCosts.isEmpty {
                LoadingView(message: "Loading costs...")
            } else if let error = viewModel.errorMessage, viewModel.jobCosts.isEmpty {
                ErrorView(message: error) {
                    await viewModel.loadData(projectId: projectId, companyId: companyId)
                }
            } else {
                VStack(spacing: 0) {
                    // Summary bar
                    JobCostSummaryView(viewModel: viewModel)

                    if viewModel.jobCosts.isEmpty {
                        EmptyStateView(
                            icon: "dollarsign.circle",
                            title: "No Cost Entries",
                            message: "Add cost entries to track job expenses."
                        )
                    } else {
                        List {
                            ForEach(viewModel.jobCosts) { cost in
                                JobCostRowView(
                                    cost: cost,
                                    costCode: viewModel.costCode(for: cost.costCodeId)
                                )
                            }
                        }
                        .listStyle(.plain)
                        .refreshable {
                            await viewModel.loadData(projectId: projectId, companyId: companyId)
                        }
                    }
                }
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingForm = true
                } label: {
                    Image(systemName: "plus")
                }
                .accessibilityLabel("Add cost entry")
            }
        }
        .sheet(isPresented: $showingForm) {
            JobCostFormView(
                projectId: projectId,
                costCodes: viewModel.costCodes
            ) { newCost in
                await viewModel.createJobCost(newCost)
            }
        }
        .task {
            await viewModel.loadData(projectId: projectId, companyId: companyId)
        }
        .task {
            await viewModel.subscribeToRealtime(projectId: projectId)
        }
        .onDisappear {
            // SwiftUI cancels the .task above, but the underlying
            // RealtimeChannelV2 stays subscribed unless we explicitly tear
            // it down — leaking server-side resources across navigations.
            Task { await viewModel.unsubscribeFromRealtime() }
        }
    }
}

import SwiftUI

/// Project hub. Every section the web project page has that a phone user
/// works in is one tap from here, grouped the way the work is done.
struct ProjectDetailView: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel: ProjectDetailViewModel

    init(project: Project) {
        _viewModel = State(initialValue: ProjectDetailViewModel(project: project))
    }

    private var project: Project { viewModel.project }
    private var companyId: String { auth.companyId ?? project.companyId }
    private var siteId: String { auth.siteId ?? project.siteId ?? "" }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        StatusBadge(status: project.status ?? "active")
                        Spacer()
                        if project.effectiveBudget > 0 {
                            Text(CurrencyFormatter.format(project.effectiveBudget))
                                .font(.subheadline.monospacedDigit())
                                .foregroundStyle(.secondary)
                        }
                    }
                    ProgressView(value: min(max(project.completionPercentage ?? 0, 0), 100), total: 100) {
                        Text("\(Int(project.completionPercentage ?? 0))% complete")
                            .font(.subheadline)
                    }
                    if project.startDate != nil || project.endDate != nil {
                        Text("\(DateFormatting.medium(project.startDate)) to \(DateFormatting.medium(project.endDate))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
                .accessibilityElement(children: .combine)

                NavigationLink {
                    ProjectOverviewView(project: project)
                        .navigationTitle("Details")
                } label: {
                    Label("Project Details", systemImage: "info.circle")
                }
            }

            Section("Field") {
                link("Crew on Site", icon: "person.3") {
                    CrewPresenceView(projectId: project.id)
                }
                link("Photos", icon: "photo.on.rectangle") {
                    ProjectPhotosView(project: project, companyId: companyId)
                }
                link("Tasks", icon: "checklist") {
                    TaskListView(projectId: project.id, companyId: companyId, siteId: siteId)
                }
                link("Daily Reports", icon: "doc.text") {
                    DailyReportListView(projectId: project.id, companyId: companyId, siteId: siteId)
                }
                link("Materials", icon: "shippingbox") {
                    MaterialListView(projectId: project.id, companyId: companyId)
                }
                link("Punch List", icon: "checklist.checked") {
                    PunchListView(projectId: project.id, companyId: companyId)
                }
                link("Safety", icon: "cross.case") {
                    SafetyIncidentListView(projectId: project.id, companyId: companyId)
                }
            }

            Section("Money") {
                link("Job Costs", icon: "dollarsign.circle") {
                    JobCostListView(projectId: project.id, companyId: companyId)
                }
                link("Change Orders", icon: "arrow.triangle.2.circlepath.doc.on.clipboard") {
                    ChangeOrderListView(projectId: project.id)
                }
                link("Expenses", icon: "creditcard") {
                    ExpenseListView(projectId: project.id, companyId: companyId, siteId: siteId.isEmpty ? nil : siteId)
                }
                if InvoicePermissions.financeRoles.contains(auth.userRole) {
                    link("Invoices", icon: "doc.text.magnifyingglass") {
                        InvoiceListView(projectId: project.id)
                    }
                }
            }

            Section("Team") {
                link("Team Chat", icon: "bubble.left.and.bubble.right") {
                    ProjectChatView(project: project, companyId: companyId)
                }
            }

            Section("Paperwork") {
                link("RFIs", icon: "questionmark.bubble") {
                    RFIListView(projectId: project.id, companyId: companyId)
                }
                link("Submittals", icon: "doc.badge.gearshape") {
                    SubmittalListView(projectId: project.id, companyId: companyId)
                }
                link("Documents", icon: "folder") {
                    DocumentListView(projectId: project.id, companyId: companyId, siteId: siteId.isEmpty ? nil : siteId)
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(project.name)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func link<Destination: View>(
        _ title: String,
        icon: String,
        @ViewBuilder destination: @escaping () -> Destination
    ) -> some View {
        NavigationLink {
            destination()
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(.inline)
        } label: {
            Label(title, systemImage: icon)
        }
    }
}

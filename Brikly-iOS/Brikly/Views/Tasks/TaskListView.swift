import SwiftUI

struct TaskListView: View {
    let projectId: String
    let companyId: String
    let siteId: String

    @State private var viewModel = TaskListViewModel()
    @State private var showingForm = false
    @State private var editingTask: ProjectTask?

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.tasks.isEmpty {
                LoadingView(message: "Loading tasks...")
            } else if let error = viewModel.errorMessage, viewModel.tasks.isEmpty {
                ErrorView(message: error) {
                    await viewModel.loadTasks(projectId: projectId)
                }
            } else {
                VStack(spacing: 0) {
                    // Status filter chips
                    StatusFilterBar(
                        statuses: TaskStatus.allCases.filter { $0 != .unknown },
                        selected: viewModel.selectedStatus,
                        onSelect: { viewModel.selectedStatus = $0 }
                    )

                    if viewModel.filteredTasks.isEmpty {
                        EmptyStateView(
                            icon: "checklist",
                            title: "No Tasks",
                            message: viewModel.selectedStatus != nil
                                ? "No tasks match the selected filter."
                                : "Add a task to get started."
                        )
                    } else {
                        List {
                            ForEach(viewModel.filteredTasks) { task in
                                TaskRowView(task: task)
                                    .contentShape(Rectangle())
                                    .onTapGesture { editingTask = task }
                            }
                        }
                        .listStyle(.plain)
                        .refreshable { await viewModel.loadTasks(projectId: projectId) }
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
            }
        }
        .sheet(isPresented: $showingForm) {
            TaskFormView(
                projectId: projectId,
                companyId: companyId,
                siteId: siteId
            ) { newTask in
                await viewModel.createTask(newTask)
            }
        }
        .sheet(item: $editingTask) { task in
            TaskFormView(
                projectId: projectId,
                companyId: companyId,
                siteId: siteId,
                existing: task
            ) { newTask in
                let updates = TaskUpdate(
                    name: newTask.name,
                    description: newTask.description,
                    status: newTask.status,
                    priority: newTask.priority,
                    assignedTo: newTask.assignedTo,
                    dueDate: newTask.dueDate,
                    completionPercentage: newTask.completionPercentage
                )
                await viewModel.updateTask(id: task.id, updates: updates)
            }
        }
        .task { await viewModel.loadTasks(projectId: projectId) }
    }
}

// MARK: - Status Filter Bar

private struct StatusFilterBar: View {
    let statuses: [TaskStatus]
    let selected: TaskStatus?
    let onSelect: (TaskStatus?) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(label: "All", isSelected: selected == nil) {
                    onSelect(nil)
                }
                ForEach(statuses, id: \.self) { status in
                    FilterChip(label: status.label, isSelected: selected == status) {
                        onSelect(status == selected ? nil : status)
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(.bar)
    }
}

private struct FilterChip: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.caption.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.accentColor : Color(.tertiarySystemFill))
                .foregroundStyle(isSelected ? .white : .primary)
                .clipShape(Capsule())
        }
    }
}

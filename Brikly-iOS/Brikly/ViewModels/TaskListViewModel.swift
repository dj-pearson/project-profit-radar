import Foundation
import Observation

@Observable
@MainActor
final class TaskListViewModel {
    var tasks: [ProjectTask] = []
    var isLoading = false
    var errorMessage: String?
    var selectedStatus: TaskStatus?

    private let service = TaskService()

    var filteredTasks: [ProjectTask] {
        guard let status = selectedStatus else { return tasks }
        return tasks.filter { $0.displayStatus == status }
    }

    func loadTasks(projectId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            tasks = try await service.fetchTasks(projectId: projectId)
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "TaskList")
        }
        isLoading = false
    }

    func createTask(_ task: NewTask) async {
        do {
            let created = try await service.createTask(task)
            tasks.insert(created, at: 0)
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "CreateTask")
        }
    }

    func updateTask(id: String, updates: TaskUpdate) async {
        do {
            let updated = try await service.updateTask(id: id, updates: updates)
            if let index = tasks.firstIndex(where: { $0.id == id }) {
                tasks[index] = updated
            }
        } catch {
            errorMessage = DecodingErrorHelper.handle(error, context: "UpdateTask")
        }
    }
}

import Foundation

/// Change orders go through the `change-orders` edge function, as on web:
/// it assigns the `CO-###` number, creates approver tasks and enforces who
/// may approve. Nothing here writes `change_orders` directly.
actor ChangeOrderService {
    private let functions = EdgeFunctionsService.shared

    private struct ListResponse: Decodable {
        let data: Payload?
        let error: String?
        struct Payload: Decodable { let changeOrders: [ChangeOrder] }
    }

    private struct SingleResponse: Decodable {
        let data: Payload?
        let error: String?
        struct Payload: Decodable { let changeOrder: ChangeOrder }
    }

    private struct ListBody: Encodable {
        let action = "list"
        let projectId: String
    }

    struct CreateBody: Encodable, Sendable {
        let action = "create"
        let projectId: String
        var title: String
        var description: String?
        var amount: Double
        var reason: String?
        var approvalDueDate: String?
    }

    /// Sent with raw keys: the function's schema reads `orderId` and
    /// `approvalType` in camelCase.
    private struct ApproveBody: Encodable {
        let action = "approve"
        let orderId: String
        let approvalType = "internal"
        let approved: Bool
        let rejectionReason: String?
    }

    func list(projectId: String) async throws -> [ChangeOrder] {
        let response: ListResponse = try await readable {
            try await functions.invoke("change-orders", body: ListBody(projectId: projectId))
        }
        if let error = response.error { throw ChangeOrderError.server(error) }
        return response.data?.changeOrders ?? []
    }

    func create(_ body: CreateBody) async throws -> ChangeOrder {
        let response: SingleResponse = try await readable {
            try await functions.invoke("change-orders", body: body)
        }
        guard let order = response.data?.changeOrder else {
            throw ChangeOrderError.server(response.error ?? "No change order returned.")
        }
        return order
    }

    /// Internal approval or rejection. The client's side is recorded only
    /// from the client portal; the function refuses it from staff.
    func decide(orderId: String, approved: Bool, reason: String?) async throws -> ChangeOrder {
        let body = ApproveBody(orderId: orderId, approved: approved, rejectionReason: reason)
        let response: SingleResponse = try await readable {
            try await functions.invoke("change-orders", body: body, snakeCaseKeys: false)
        }
        guard let order = response.data?.changeOrder else {
            throw ChangeOrderError.server(response.error ?? "No change order returned.")
        }
        return order
    }

    /// Surface the function's `{ error }` message (e.g. "Insufficient
    /// permissions...") instead of the raw HTTP body.
    private func readable<T>(_ call: () async throws -> T) async throws -> T {
        do {
            return try await call()
        } catch EdgeFunctionsService.EdgeFunctionError.httpError(_, let body) {
            struct Envelope: Decodable { let error: String? }
            let message = (try? JSONDecoder().decode(Envelope.self, from: Data(body.utf8)))?.error
            throw ChangeOrderError.server(message ?? body)
        }
    }

    enum ChangeOrderError: LocalizedError {
        case server(String)
        var errorDescription: String? {
            if case .server(let message) = self { return message }
            return nil
        }
    }
}

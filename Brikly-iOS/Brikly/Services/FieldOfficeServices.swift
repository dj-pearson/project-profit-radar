import Foundation
import Supabase
import Realtime

actor MaterialService {
    private let client = SupabaseService.shared.client

    func materials(companyId: String) async throws -> [Material] {
        try await client
            .from("materials")
            .select()
            .eq("company_id", value: companyId)
            .eq("is_active", value: true)
            .order("name", ascending: true)
            .execute()
            .value
    }

    func usage(projectId: String) async throws -> [MaterialUsage] {
        try await client
            .from("material_usage")
            .select("id, material_id, project_id, quantity_used, total_cost, date_used, notes, materials(name)")
            .eq("project_id", value: projectId)
            .order("date_used", ascending: false)
            .limit(50)
            .execute()
            .value
    }

    func logUsage(_ params: LogMaterialUsageParams) async throws -> LogMaterialUsageResult {
        try await client
            .rpc("log_material_usage", params: params)
            .execute()
            .value
    }
}

actor InvoiceService {
    private let client = SupabaseService.shared.client
    private let functions = EdgeFunctionsService.shared

    func invoices(projectId: String) async throws -> [Invoice] {
        try await client
            .from("invoices")
            .select()
            .eq("project_id", value: projectId)
            .order("issue_date", ascending: false)
            .execute()
            .value
    }

    func lineItems(invoiceId: String) async throws -> [InvoiceLineItem] {
        try await client
            .from("invoice_line_items")
            .select()
            .eq("invoice_id", value: invoiceId)
            .execute()
            .value
    }

    func payments(invoiceId: String) async throws -> [InvoicePayment] {
        try await client
            .from("invoice_payments")
            .select()
            .eq("invoice_id", value: invoiceId)
            .order("payment_date", ascending: false)
            .execute()
            .value
    }

    private struct ManualPaymentBody: Encodable {
        let invoiceId: String
        let paymentMethod = "manual"
        let manualPaymentAmount: Double
        let manualPaymentNotes: String?
    }

    private struct SendBody: Encodable {
        let invoiceId: String
        let to: String?
        let message: String?
    }

    /// A cheque, cash or transfer recorded by the office. Goes through
    /// `process-invoice-payment` -> `record_invoice_payment`, whose trigger
    /// recomputes the invoice totals and status.
    func recordPayment(invoiceId: String, amount: Double, notes: String?) async throws {
        try await readable {
            try await functions.invoke("process-invoice-payment", body: ManualPaymentBody(
                invoiceId: invoiceId, manualPaymentAmount: amount, manualPaymentNotes: notes
            ))
        }
    }

    /// Emails the client a portal link and marks a draft as sent.
    func send(invoiceId: String, to: String?, message: String?) async throws {
        try await readable {
            try await functions.invoke("send-invoice", body: SendBody(invoiceId: invoiceId, to: to, message: message))
        }
    }

    private struct ErrorEnvelope: Decodable { let error: String? }

    private func readable(_ call: () async throws -> Void) async throws {
        do {
            try await call()
        } catch EdgeFunctionsService.EdgeFunctionError.httpError(_, let body) {
            let message = (try? JSONDecoder().decode(ErrorEnvelope.self, from: Data(body.utf8)))?.error
            throw ServiceMessage(message ?? body)
        }
    }
}

/// An error whose text is already fit to show.
struct ServiceMessage: LocalizedError {
    let text: String
    init(_ text: String) { self.text = text }
    var errorDescription: String? { text }
}

actor ChatService {
    private let client = SupabaseService.shared.client

    /// The project's open channel, creating it (with the caller as channel
    /// admin) when there is none, and joining it when the caller isn't a
    /// member yet.
    func projectChannel(project: Project, companyId: String, userId: String) async throws -> ChatChannel {
        let existing: [ChatChannel] = try await client
            .from("chat_channels")
            .select("id, company_id, name, channel_type, project_id, is_private, created_by")
            .eq("project_id", value: project.id)
            .eq("is_private", value: false)
            .is("archived_at", value: nil)
            .order("created_at", ascending: true)
            .limit(1)
            .execute()
            .value

        if let channel = existing.first {
            try await ensureMember(channelId: channel.id, companyId: companyId, userId: userId, role: "member")
            return channel
        }

        let created: [ChatChannel] = try await client
            .from("chat_channels")
            .insert(NewChatChannel(companyId: companyId, name: project.name, projectId: project.id, createdBy: userId))
            .select("id, company_id, name, channel_type, project_id, is_private, created_by")
            .execute()
            .value
        guard let channel = created.first else { throw ServiceError.notFound("Channel") }
        try await ensureMember(channelId: channel.id, companyId: companyId, userId: userId, role: "admin")
        return channel
    }

    private func ensureMember(channelId: String, companyId: String, userId: String, role: String) async throws {
        struct Row: Decodable { let id: String }
        let rows: [Row] = try await client
            .from("chat_channel_members")
            .select("id")
            .eq("channel_id", value: channelId)
            .eq("user_id", value: userId)
            .limit(1)
            .execute()
            .value
        guard rows.isEmpty else { return }
        try await client
            .from("chat_channel_members")
            .insert(NewChannelMember(channelId: channelId, companyId: companyId, userId: userId, role: role))
            .execute()
    }

    /// The latest messages, oldest first.
    func messages(channelId: String, limit: Int = 100) async throws -> [ChatMessage] {
        let rows: [ChatMessage] = try await client
            .from("chat_messages")
            .select("id, channel_id, user_id, content, message_type, created_at, edited_at")
            .eq("channel_id", value: channelId)
            .order("created_at", ascending: false)
            .limit(limit)
            .execute()
            .value
        return rows.reversed()
    }

    func send(_ message: NewChatMessage) async throws {
        try await client.from("chat_messages").insert(message).execute()
    }

    func markRead(channelId: String) async {
        struct Params: Encodable, Sendable {
            let pChannelId: String
            enum CodingKeys: String, CodingKey { case pChannelId = "p_channel_id" }
        }
        _ = try? await client.rpc("mark_chat_channel_read", params: Params(pChannelId: channelId)).execute()
    }

    func names(userIds: [String]) async -> [String: String] {
        struct Params: Encodable, Sendable {
            let pUserIds: [String]
            enum CodingKeys: String, CodingKey { case pUserIds = "p_user_ids" }
        }
        guard !userIds.isEmpty else { return [:] }
        let rows: [MemberName]? = try? await client
            .rpc("company_member_names", params: Params(pUserIds: userIds))
            .execute()
            .value
        var result: [String: String] = [:]
        for row in rows ?? [] {
            if let name = row.displayName { result[row.userId] = name }
        }
        return result
    }

    func realtimeChannel(channelId: String) -> RealtimeChannelV2 {
        client.realtimeV2.channel("chat_\(channelId)")
    }

    /// Unsubscribe and drop the channel from the client's cache, so reopening
    /// the chat gets a fresh channel instead of the old, already-subscribed
    /// one (which accepts no new postgres_changes listeners).
    func removeRealtime(_ channel: RealtimeChannelV2) async {
        await client.realtimeV2.removeChannel(channel)
    }
}

actor TimesheetService {
    private let client = SupabaseService.shared.client

    func pending() async throws -> [PendingTimesheet] {
        try await client
            .from("pending_timesheet_approvals")
            .select()
            .order("start_time", ascending: false)
            .limit(200)
            .execute()
            .value
    }

    private struct ApproveParams: Encodable, Sendable {
        let timesheetIds: [String]
        let approverId: String
        let notes: String?
        enum CodingKeys: String, CodingKey {
            case timesheetIds = "timesheet_ids"
            case approverId = "approver_id"
            case notes
        }
    }

    private struct RejectParams: Encodable, Sendable {
        let timesheetIds: [String]
        let rejectorId: String
        let rejectionReason: String
        enum CodingKeys: String, CodingKey {
            case timesheetIds = "timesheet_ids"
            case rejectorId = "rejector_id"
            case rejectionReason = "rejection_reason"
        }
    }

    /// The server takes the approver from the session; the id is sent only
    /// because the function signature has it.
    func approve(ids: [String], approverId: String, notes: String?) async throws -> BulkTimesheetResult {
        let rows: [BulkTimesheetResult] = try await client
            .rpc("bulk_approve_timesheets", params: ApproveParams(timesheetIds: ids, approverId: approverId, notes: notes))
            .execute()
            .value
        return rows.first ?? BulkTimesheetResult(successCount: 0, failedCount: ids.count)
    }

    func reject(ids: [String], rejectorId: String, reason: String) async throws -> BulkTimesheetResult {
        let rows: [BulkTimesheetResult] = try await client
            .rpc("bulk_reject_timesheets", params: RejectParams(timesheetIds: ids, rejectorId: rejectorId, rejectionReason: reason))
            .execute()
            .value
        return rows.first ?? BulkTimesheetResult(successCount: 0, failedCount: ids.count)
    }
}

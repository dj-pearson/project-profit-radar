import SwiftUI
import Realtime

/// Team chat for one project, on the web's chat tables (chat_channels /
/// chat_channel_members / chat_messages). Opening it creates the project's
/// channel if there is none and joins it if needed. New messages arrive over
/// Realtime while the screen is open.
@Observable
@MainActor
final class ProjectChatViewModel {
    var channel: ChatChannel?
    var messages: [ChatMessage] = []
    var names: [String: String] = [:]
    var draft = ""
    var isLoading = false
    var isSending = false
    var errorMessage: String?

    private let service = ChatService()
    @ObservationIgnored private var realtime: RealtimeChannelV2?

    func open(project: Project, companyId: String, userId: String) async {
        isLoading = channel == nil
        errorMessage = nil
        defer { isLoading = false }
        do {
            let found = try await service.projectChannel(project: project, companyId: companyId, userId: userId)
            channel = found
            await reload()
            await service.markRead(channelId: found.id)
        } catch {
            errorMessage = "Couldn't open the project chat: \(error.localizedDescription)"
        }
    }

    func reload() async {
        guard let channel else { return }
        let fresh = try? await service.messages(channelId: channel.id)
        guard let fresh else { return }
        messages = fresh
        let unknown = Array(Set(fresh.map(\.userId)).subtracting(names.keys))
        if !unknown.isEmpty {
            let found = await service.names(userIds: unknown)
            names.merge(found) { _, new in new }
        }
    }

    func send(companyId: String, userId: String) async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let channel, !text.isEmpty else { return }
        isSending = true
        defer { isSending = false }
        do {
            try await service.send(NewChatMessage(channelId: channel.id, companyId: companyId, userId: userId, content: text))
            draft = ""
            await reload()
        } catch {
            errorMessage = "Message not sent: \(error.localizedDescription)"
        }
    }

    func listen() async {
        guard let channel, realtime == nil, NetworkMonitor.shared.isOnline else { return }
        let subscription = await service.realtimeChannel(channelId: channel.id)
        realtime = subscription
        let inserts = await subscription.postgresChange(
            InsertAction.self,
            schema: "public",
            table: "chat_messages",
            filter: "channel_id=eq.\(channel.id)"
        )
        await subscription.subscribe()
        for await _ in inserts {
            await reload()
            await service.markRead(channelId: channel.id)
        }
    }

    func stopListening() async {
        await realtime?.unsubscribe()
        realtime = nil
    }
}

struct ProjectChatView: View {
    let project: Project
    let companyId: String

    @Environment(AuthViewModel.self) private var auth
    @State private var viewModel = ProjectChatViewModel()
    @FocusState private var composerFocused: Bool

    private var userId: String { auth.userProfile?.id ?? "" }

    var body: some View {
        @Bindable var vm = viewModel

        VStack(spacing: 0) {
            if viewModel.isLoading {
                LoadingView(message: "Opening chat...")
            } else if viewModel.channel == nil, let error = viewModel.errorMessage {
                ErrorView(message: error) { await open() }
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            if viewModel.messages.isEmpty {
                                Text("No messages yet. Everyone on this project's chat sees what you post here.")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(.center)
                                    .padding(.top, 40)
                                    .padding(.horizontal)
                            }
                            ForEach(viewModel.messages) { message in
                                MessageBubble(
                                    message: message,
                                    isMine: message.userId == userId,
                                    senderName: viewModel.names[message.userId] ?? "Teammate"
                                )
                                .id(message.id)
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                    }
                    .scrollDismissesKeyboard(.interactively)
                    .onChange(of: viewModel.messages.last?.id) {
                        if let last = viewModel.messages.last?.id {
                            withAnimation { proxy.scrollTo(last, anchor: .bottom) }
                        }
                    }
                    .onAppear {
                        if let last = viewModel.messages.last?.id { proxy.scrollTo(last, anchor: .bottom) }
                    }
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(Color.brandDanger)
                        .padding(.horizontal)
                }

                HStack(alignment: .bottom, spacing: 8) {
                    TextField("Message", text: $vm.draft, axis: .vertical)
                        .lineLimit(1...5)
                        .textFieldStyle(.roundedBorder)
                        .focused($composerFocused)
                    Button {
                        Task { await viewModel.send(companyId: companyId, userId: userId) }
                    } label: {
                        Image(systemName: "arrow.up.circle.fill").font(.title2)
                    }
                    .disabled(viewModel.isSending || viewModel.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .accessibilityLabel("Send")
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(.bar)
            }
        }
        .navigationTitle("Team Chat")
        .task {
            await open()
            await viewModel.listen()
        }
        .onDisappear { Task { await viewModel.stopListening() } }
    }

    private func open() async {
        await viewModel.open(project: project, companyId: companyId, userId: userId)
    }
}

private struct MessageBubble: View {
    let message: ChatMessage
    let isMine: Bool
    let senderName: String

    var body: some View {
        HStack {
            if isMine { Spacer(minLength: 48) }
            VStack(alignment: isMine ? .trailing : .leading, spacing: 2) {
                if !isMine {
                    Text(senderName).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                }
                Text(message.content ?? "")
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(isMine ? Color.accentColor : Color(.secondarySystemBackground),
                                in: RoundedRectangle(cornerRadius: 14))
                    .foregroundStyle(isMine ? Color.white : Color.primary)
                Text(message.createdAt.formatted(date: .omitted, time: .shortened))
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            if !isMine { Spacer(minLength: 48) }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(isMine ? "You" : senderName): \(message.content ?? "")")
    }
}

import SwiftUI

struct NotificationListView: View {
    @Environment(AuthViewModel.self) private var auth
    let viewModel: NotificationListViewModel

    private var recipientId: String { auth.userProfile?.id ?? "" }

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView(message: "Loading alerts...")
                } else if let error = viewModel.errorMessage, viewModel.notifications.isEmpty {
                    ErrorView(message: error) { await viewModel.load(recipientId: recipientId) }
                } else if viewModel.notifications.isEmpty {
                    EmptyStateView(
                        icon: "bell.slash",
                        title: "No Alerts",
                        message: "Approvals, assignments and safety alerts show up here."
                    )
                } else {
                    List(viewModel.notifications) { notification in
                        NotificationRowView(notification: notification)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                Task { await viewModel.markRead(notification, recipientId: recipientId) }
                            }
                            .accessibilityAddTraits(.isButton)
                            .accessibilityHint(notification.isUnread ? "Marks as read" : "")
                    }
                    .listStyle(.plain)
                    .refreshable { await viewModel.load(recipientId: recipientId) }
                }
            }
            .navigationTitle("Alerts")
            .toolbar {
                if viewModel.unreadCount > 0 {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Mark All Read") {
                            Task { await viewModel.markAllRead(recipientId: recipientId) }
                        }
                    }
                }
            }
        }
    }
}

private struct NotificationRowView: View {
    let notification: AppNotification

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: notification.icon)
                .font(.title3)
                .foregroundStyle(notification.isUnread ? Color.accentColor : .secondary)
                .frame(width: 28)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                Text(notification.title)
                    .font(.body.weight(notification.isUnread ? .semibold : .regular))
                Text(notification.message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
                Text(notification.createdAt, style: .relative)
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            Spacer(minLength: 0)
            if notification.isUnread {
                Circle()
                    .fill(Color.accentColor)
                    .frame(width: 8, height: 8)
                    .accessibilityLabel("Unread")
            }
        }
        .padding(.vertical, 4)
    }
}
